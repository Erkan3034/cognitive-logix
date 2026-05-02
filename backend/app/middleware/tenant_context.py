from __future__ import annotations

import base64
import json
import os
import time
from typing import Any

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.services.supabase_ops import SupabaseNotConfigured, insert_row, is_configured


TRACKED_PREFIXES = ("/predict", "/forecast", "/fraud", "/metrics", "/api/v1/ingest", "/ops")


def _decode_jwt_payload(token: str) -> dict[str, Any]:
    try:
        payload = token.split(".")[1]
        payload += "=" * (-len(payload) % 4)
        return json.loads(base64.urlsafe_b64decode(payload.encode("utf-8")))
    except Exception:
        return {}


def _context_from_request(request: Request) -> tuple[str | None, str | None]:
    tenant_id = request.headers.get("x-tenant-id")
    user_id = request.headers.get("x-user-id")
    auth = request.headers.get("authorization", "")

    # 1. JWT Bearer token ile kimlik doğrulama
    if auth.lower().startswith("bearer "):
        payload = _decode_jwt_payload(auth.split(" ", 1)[1].strip())
        user_id = user_id or payload.get("sub")
        metadata = payload.get("user_metadata") or {}
        app_metadata = payload.get("app_metadata") or {}
        tenant_id = tenant_id or metadata.get("tenant_id") or app_metadata.get("tenant_id")
        return tenant_id, user_id

    # 2. API Key ile kimlik doğrulama (ERP, webhook, dış sistemler)
    api_key = request.headers.get("x-api-key")
    if api_key:
        try:
            from app.services.api_key_service import validate_api_key
            result = validate_api_key(api_key)
            if result:
                tenant_id = tenant_id or result.get("tenant_id")
                user_id = user_id or result.get("user_id")
                # Scope bilgisini request state'e ekle (ileride rate limiting için)
                request.state.api_key_scopes = result.get("scopes", [])
                request.state.api_key_id = result.get("key_id")
        except Exception:
            pass  # API key doğrulama hatası ana akışı kırmamalı

    return tenant_id, user_id


class TenantUsageMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        tenant_id, user_id = _context_from_request(request)
        request.state.tenant_id = tenant_id
        request.state.user_id = user_id

        tracked = request.url.path.startswith(TRACKED_PREFIXES)
        auth_required = os.getenv("TENANT_AUTH_REQUIRED", "false").lower() == "true"
        if tracked and auth_required and (not tenant_id or not user_id):
            return JSONResponse(
                status_code=401,
                content={"detail": "Tenant authentication is required for this endpoint."},
            )

        # Limit kontrolü
        if tracked and tenant_id and is_configured():
            try:
                from app.services.supabase_ops import get_supabase_admin
                from app.routers.billing import PLAN_LIMITS
                import datetime
                
                sb = get_supabase_admin()
                tenant_resp = sb.table("tenants").select("plan").eq("id", tenant_id).execute()
                tenant_data = getattr(tenant_resp, "data", [])
                
                if tenant_data:
                    plan = tenant_data[0].get("plan", "free")
                    limit = PLAN_LIMITS.get(plan, 100)
                    
                    first_day_of_month = datetime.datetime.now(datetime.timezone.utc).replace(day=1, hour=0, minute=0, second=0).isoformat()
                    usage_resp = sb.table("usage_logs").select("id", count="exact").eq("tenant_id", tenant_id).gte("created_at", first_day_of_month).execute()
                    used_count = getattr(usage_resp, "count", 0) or 0
                    
                    if used_count >= limit:
                        return JSONResponse(
                            status_code=429,
                            content={
                                "detail": f"Aylik kota asildi. {plan.upper()} plani {limit} istek ile sinirlidir.",
                                "code": "QUOTA_EXCEEDED"
                            }
                        )
            except Exception:
                pass  # DB hatası olursa isteği engelleme

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
                        "endpoint": request.url.path,
                        "method": request.method,
                        "status_code": response.status_code,
                        "duration_ms": elapsed_ms,
                        "units": 1,
                    },
                )
            except SupabaseNotConfigured:
                pass
            except Exception:
                # Usage logging must not break the core prediction path.
                pass

        return response
