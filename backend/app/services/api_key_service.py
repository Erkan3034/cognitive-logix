"""
API Key Service — Üretim, doğrulama ve yönetim.

Firmalar panelden key üretir. Bu key SHA-256 ile hash'lenerek saklanır.
Dış sistemler (ERP, webhook) bu key'i `X-API-Key` header'ı ile gönderir.
"""
from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timezone
from typing import Any

from app.services.supabase_ops import get_supabase_admin, is_configured


KEY_PREFIX = "cl_"
KEY_LENGTH = 40


def _hash_key(raw_key: str) -> str:
    """Key'in SHA-256 hash'ini üretir. Veritabanında sadece hash saklanır."""
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


def generate_api_key(
    tenant_id: str,
    user_id: str,
    label: str = "Default Key",
    scopes: list[str] | None = None,
) -> dict[str, Any]:
    """
    Yeni bir API key üretir ve Supabase'e hash'ini kaydeder.
    Düz key sadece bir kez kullanıcıya gösterilir (sonra bir daha görülmez).
    """
    if not is_configured():
        raise RuntimeError("Supabase is not configured.")


    raw_key = KEY_PREFIX + secrets.token_urlsafe(KEY_LENGTH)
    key_hash = _hash_key(raw_key)
    key_prefix_display = raw_key[:12] + "****"

    if scopes is None:
        scopes = ["predict", "forecast", "fraud", "ingest"]

    sb = get_supabase_admin()
    response = sb.table("api_keys").insert({
        "tenant_id": tenant_id,
        "user_id": user_id,
        "key_hash": key_hash,
        "key_prefix": key_prefix_display,
        "label": label,
        "scopes": scopes,
        "is_active": True,
    }).execute()

    data = getattr(response, "data", None)
    row = data[0] if isinstance(data, list) and data else {}

    return {
        "id": row.get("id"),
        "raw_key": raw_key,
        "key_prefix": key_prefix_display,
        "label": label,
        "scopes": scopes,
        "created_at": row.get("created_at"),
    }


def validate_api_key(raw_key: str) -> dict[str, Any] | None:
    """
    Gelen API key'i hash'leyip veritabanında arar.
    Geçerliyse tenant_id, user_id ve scopes döner.
    Geçersiz veya deaktifse None döner.
    """
    if not is_configured() or not raw_key:
        return None

    key_hash = _hash_key(raw_key)
    sb = get_supabase_admin()

    response = (
        sb.table("api_keys")
        .select("id, tenant_id, user_id, scopes, is_active, expires_at")
        .eq("key_hash", key_hash)
        .eq("is_active", True)
        .limit(1)
        .execute()
    )

    data = getattr(response, "data", None)
    if not isinstance(data, list) or not data:
        return None

    row = data[0]


    expires_at = row.get("expires_at")
    if expires_at:
        exp = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
        if exp < datetime.now(timezone.utc):
            return None


    try:
        sb.table("api_keys").update({
            "last_used_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", row["id"]).execute()
    except Exception:
        pass

    return {
        "key_id": row["id"],
        "tenant_id": row.get("tenant_id"),
        "user_id": row.get("user_id"),
        "scopes": row.get("scopes", []),
    }


def list_api_keys(user_id: str) -> list[dict[str, Any]]:
    """Kullanıcının tüm API key'lerini listeler (hash'siz)."""
    if not is_configured():
        return []

    sb = get_supabase_admin()
    response = (
        sb.table("api_keys")
        .select("id, key_prefix, label, scopes, is_active, last_used_at, expires_at, created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return getattr(response, "data", None) or []


def revoke_api_key(key_id: str, user_id: str) -> bool:
    """API key'i deaktif eder (siler değil, izlenebilirlik için)."""
    if not is_configured():
        return False

    sb = get_supabase_admin()
    response = (
        sb.table("api_keys")
        .update({"is_active": False})
        .eq("id", key_id)
        .eq("user_id", user_id)
        .execute()
    )
    data = getattr(response, "data", None)
    return isinstance(data, list) and len(data) > 0
