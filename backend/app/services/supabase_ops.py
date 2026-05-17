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


def insert_rows(table: str, rows: list[dict[str, Any]], chunk_size: int = 500) -> int:
    inserted = 0
    import time
    client = get_supabase_admin()
    for start in range(0, len(rows), chunk_size):
        chunk = rows[start : start + chunk_size]
        if not chunk:
            continue
        try:
            response = client.table(table).insert(chunk).execute()
            data = getattr(response, "data", None)
            inserted += len(data) if isinstance(data, list) else len(chunk)
        except Exception as exc:
            import logging
            logging.getLogger(__name__).warning("Chunk insert failed at %d: %s. Retrying...", start, exc)
            time.sleep(0.5)
            response = client.table(table).insert(chunk).execute()
            data = getattr(response, "data", None)
            inserted += len(data) if isinstance(data, list) else len(chunk)
        time.sleep(0.05)  # Prevent Windows socket exhaustion
    return inserted


def select_rows(table: str, tenant_id: str | None, limit: int = 100) -> list[dict[str, Any]]:
    query = get_supabase_admin().table(table).select("*").order("created_at", desc=True).limit(limit)
    if tenant_id:
        query = query.eq("tenant_id", tenant_id)
    try:
        response = query.execute()
    except Exception as exc:
        import time
        import logging
        logging.getLogger(__name__).warning("select_rows failed: %s. Retrying...", exc)
        time.sleep(0.5)
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


def delete_rows_by_batch(table: str, batch_id: str) -> int:
    """Belirli bir batch_id'ye ait tum satirlari siler (yarida kalan yuklemeler icin)."""
    try:
        client = get_supabase_admin()
        response = client.table(table).delete().eq("batch_id", batch_id).execute()
        data = getattr(response, "data", None)
        return len(data) if isinstance(data, list) else 0
    except Exception:
        return 0


def delete_history_record(table: str, record_id: str, tenant_id: str | None) -> bool:
    """Belirli bir ID'ye sahip ozet kaydini ve ona bagli tum kalici satirlari siler."""
    try:
        client = get_supabase_admin()
        
        # 1. Once silinecek kaydi bul (dosya adini ogrenmek icin)
        query = client.table(table).select("filename").eq("id", record_id)
        if tenant_id:
            query = query.eq("tenant_id", tenant_id)
        record = query.execute()
        data = getattr(record, "data", None)
        
        if not data or len(data) == 0:
            return False
            
        filename = data[0].get("filename")
        
        # 2. Eger dosya adi varsa, ingested_records tablosundan bu dosyaya ait TUM verileri sil
        if filename:
            del_query = client.table("ingested_records").delete().eq("source_name", filename)
            if tenant_id:
                del_query = del_query.eq("tenant_id", tenant_id)
            del_query.execute()
            
        # 3. Son olarak ozet kaydini (ingested_data) sil
        del_summary = client.table(table).delete().eq("id", record_id).execute()
        del_data = getattr(del_summary, "data", None)
        return bool(isinstance(del_data, list) and len(del_data) > 0)
    except Exception as exc:
        import logging
        logging.getLogger(__name__).error(f"delete_history_record hatasi: {exc}")
        return False

