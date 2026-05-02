from __future__ import annotations

from functools import lru_cache
from typing import Any
import os


class SupabaseNotConfigured(RuntimeError):
    pass


@lru_cache(maxsize=1)
def get_supabase_admin():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
    if not url or not key:
        raise SupabaseNotConfigured("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.")
    try:
        from supabase import create_client
    except ImportError as exc:
        raise SupabaseNotConfigured("supabase Python package is not installed.") from exc

    return create_client(url, key)


def is_configured() -> bool:
    return bool(os.getenv("SUPABASE_URL") and (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")))


def insert_row(table: str, row: dict[str, Any]) -> dict[str, Any] | None:
    response = get_supabase_admin().table(table).insert(row).execute()
    data = getattr(response, "data", None)
    if isinstance(data, list) and data:
        return data[0]
    return None


def select_rows(table: str, tenant_id: str | None, limit: int = 100) -> list[dict[str, Any]]:
    query = get_supabase_admin().table(table).select("*").order("created_at", desc=True).limit(limit)
    if tenant_id:
        query = query.eq("tenant_id", tenant_id)
    response = query.execute()
    return getattr(response, "data", None) or []


def summarize_usage(tenant_id: str | None) -> dict[str, Any]:
    rows = select_rows("usage_logs", tenant_id, limit=1000)
    by_endpoint: dict[str, int] = {}
    total_units = 0
    for row in rows:
        endpoint = row.get("endpoint") or "unknown"
        units = int(row.get("units") or 1)
        by_endpoint[endpoint] = by_endpoint.get(endpoint, 0) + units
        total_units += units
    return {
        "total_calls": len(rows),
        "total_units": total_units,
        "by_endpoint": by_endpoint,
        "recent": rows[:50],
    }
