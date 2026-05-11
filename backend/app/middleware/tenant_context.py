from __future__ import annotations

import base64
import datetime
import json
import os
import time
from typing import Any

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.services.supabase_ops import SupabaseNotConfigured, get_supabase_admin, insert_row, is_configured


TRACKED_PREFIXES = (
    "/predict",
    "/forecast",
    "/fraud",
    "/metrics",
    "/api/v1/ingest",
    "/ops",
    "/api/v1/keys",
    "/api/v1/billing",
)

BILLABLE_PREFIXES = (
    "/predict",
    "/forecast",
    "/fraud",
    "/metrics/simulate",
    "/api/v1/ingest/csv-preview",
    "/api/v1/ingest/confirm-mapping",
    "/api/v1/ingest/webhook",
)

API_KEY_SCOPE_BY_PREFIX = (
    ("/predict", "predict"),
    ("/forecast", "forecast"),
    ("/fraud", "fraud"),
    ("/api/v1/ingest", "ingest"),
    ("/metrics", "metrics"),
    ("/ops", "ops"),
    ("/api/v1/keys", "keys"),
    ("/api/v1/billing", "billing"),
)


def _decode_jwt_payload(token: str) -> dict[str, Any]:
    try:
        payload = token.split(".")[1]
        payload += "=" * (-len(payload) % 4)
        return json.loads(base64.urlsafe_b64decode(payload.encode("utf-8")))
    except Exception:
        return {}


def _scope_for_path(path: str) -> str | None:
    for prefix, scope in API_KEY_SCOPE_BY_PREFIX:
        if path.startswith(prefix):
            return scope
    return None


def _tenant_from_profile(user_id: str | None) -> str | None:
    if not user_id or not is_configured():
        return None
    try:
        response = (
            get_supabase_admin()
            .table("profiles")
            .select("tenant_id")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
        data = getattr(response, "data", None) or []
        if data:
            return data[0].get("tenant_id")
    except Exception:
        return None
    return None


def _context_from_request(request: Request) -> tuple[str | None, str | None]:
    request.state.auth_method = "anonymous"
    tenant_id = None
    user_id = None

    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        payload = _decode_jwt_payload(auth.split(" ", 1)[1].strip())
        user_id = payload.get("sub")
        metadata = payload.get("user_metadata") or {}
        app_metadata = payload.get("app_metadata") or {}
        tenant_id = metadata.get("tenant_id") or app_metadata.get("tenant_id")
        tenant_id = tenant_id or _tenant_from_profile(user_id)
        request.state.auth_method = "jwt" if user_id else "anonymous"
        return tenant_id, user_id

    api_key = request.headers.get("x-api-key")
    if api_key:
        try:
            from app.services.api_key_service import validate_api_key

            result = validate_api_key(api_key)
            if result:
                request.state.auth_method = "api_key"
                request.state.api_key_scopes = result.get("scopes", [])
                request.state.api_key_id = result.get("key_id")
                return result.get("tenant_id"), result.get("user_id")
            request.state.api_key_error = True
        except Exception:
            request.state.api_key_error = True

    tenant_id = request.headers.get("x-tenant-id")
    user_id = request.headers.get("x-user-id")
    if tenant_id or user_id:
        request.state.auth_method = "header"
    return tenant_id, user_id


class TenantUsageMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        tenant_id, user_id = _context_from_request(request)
        request.state.tenant_id = tenant_id
        request.state.user_id = user_id

        path = request.url.path
        tracked = path.startswith(TRACKED_PREFIXES)
        billable = path.startswith(BILLABLE_PREFIXES)

        auth_required = os.getenv("TENANT_AUTH_REQUIRED", "false").lower() == "true"
        if tracked and auth_required and (not tenant_id or not user_id):
            return JSONResponse(
                status_code=401,
                content={"detail": "Bu endpoint icin tenant kimligi gereklidir."},
            )

        if tracked and getattr(request.state, "api_key_error", False):
            return JSONResponse(
                status_code=401,
                content={"detail": "Gecersiz veya pasif API anahtari.", "code": "API_KEY_INVALID"},
            )

        if tracked and getattr(request.state, "auth_method", None) == "api_key":
            required_scope = _scope_for_path(path)
            scopes = set(getattr(request.state, "api_key_scopes", []) or [])
            if required_scope and required_scope not in scopes and "*" not in scopes:
                return JSONResponse(
                    status_code=403,
                    content={
                        "detail": f"Bu endpoint icin '{required_scope}' API yetkisi gereklidir.",
                        "code": "API_KEY_SCOPE_DENIED",
                    },
                )

        if billable and tenant_id and is_configured():
            try:
                from app.routers.billing import PLAN_LIMITS

                sb = get_supabase_admin()
                tenant_resp = sb.table("tenants").select("plan").eq("id", tenant_id).limit(1).execute()
                tenant_data = getattr(tenant_resp, "data", []) or []
                if tenant_data:
                    plan = tenant_data[0].get("plan", "free")
                    limit = PLAN_LIMITS.get(plan, 100)
                    first_day = (
                        datetime.datetime.now(datetime.timezone.utc)
                        .replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                        .isoformat()
                    )
                    usage_resp = (
                        sb.table("usage_logs")
                        .select("endpoint")
                        .eq("tenant_id", tenant_id)
                        .gte("created_at", first_day)
                        .limit(10000)
                        .execute()
                    )
                    rows = getattr(usage_resp, "data", None) or []
                    used_count = sum(
                        1 for row in rows if str(row.get("endpoint", "")).startswith(BILLABLE_PREFIXES)
                    )
                    if used_count >= limit:
                        return JSONResponse(
                            status_code=429,
                            content={
                                "detail": f"Aylik kota asildi. {plan.upper()} plani {limit} istek ile sinirlidir.",
                                "code": "QUOTA_EXCEEDED",
                            },
                        )
            except Exception:
                pass

        started = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = round((time.perf_counter() - started) * 1000, 2)

        if tracked and is_configured():
            try:
                insert_row(
                    "usage_logs",
                    {
                        "tenant_id": tenant_id,
                        "user_id": user_id,
                        "endpoint": path,
                        "method": request.method,
                        "status_code": response.status_code,
                        "duration_ms": elapsed_ms,
                        "units": 1,
                    },
                )
            except SupabaseNotConfigured:
                pass
            except Exception:
                pass

        return response
