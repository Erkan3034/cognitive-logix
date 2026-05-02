"""
API Key yönetim endpoint'leri.
Firmalar bu endpoint'ler üzerinden key üretir, listeler ve iptal eder.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from app.services.api_key_service import generate_api_key, list_api_keys, revoke_api_key
from app.services.supabase_ops import is_configured


router = APIRouter(prefix="/api/v1/keys", tags=["api-keys"])


class CreateKeyRequest(BaseModel):
    label: str = Field("Default Key", max_length=100)
    scopes: list[str] = Field(default=["predict", "forecast", "fraud", "ingest"])


class RevokeKeyRequest(BaseModel):
    key_id: str


def _require_user(request: Request) -> str:
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        raise HTTPException(status_code=401, detail="Kimlik doğrulaması gerekli.")
    return user_id


def _require_supabase() -> None:
    if not is_configured():
        raise HTTPException(status_code=503, detail="Supabase yapılandırılmamış.")


@router.get("")
def get_keys(request: Request):
    """Kullanıcının tüm API key'lerini listeler."""
    _require_supabase()
    user_id = _require_user(request)
    keys = list_api_keys(user_id)
    return {"items": keys, "total": len(keys)}


@router.post("")
def create_key(req: CreateKeyRequest, request: Request):
    """
    Yeni bir API key üretir.
    Düz key sadece bu cevapda bir kez gösterilir, sonra bir daha görülemez.
    """
    _require_supabase()
    user_id = _require_user(request)
    tenant_id = getattr(request.state, "tenant_id", None)

    try:
        result = generate_api_key(
            tenant_id=tenant_id,
            user_id=user_id,
            label=req.label,
            scopes=req.scopes,
        )
        return {
            "status": "success",
            "message": "API key üretildi. Bu key'i güvenli bir yere kaydedin, tekrar gösterilmeyecektir!",
            **result,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.delete("/{key_id}")
def delete_key(key_id: str, request: Request):
    """API key'i deaktif eder (iptal)."""
    _require_supabase()
    user_id = _require_user(request)
    success = revoke_api_key(key_id, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Key bulunamadı veya zaten deaktif.")
    return {"status": "success", "message": "API key iptal edildi."}
