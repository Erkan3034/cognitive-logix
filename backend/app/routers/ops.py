from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from app.services.supabase_ops import SupabaseNotConfigured, insert_row, is_configured, select_rows, summarize_usage


router = APIRouter(prefix="/ops", tags=["ops"])


class IncidentActionRequest(BaseModel):
    incident_id: str
    action: str
    status: str = Field("approved", pattern="^(approved|dismissed|queued)$")
    metadata: dict[str, Any] = Field(default_factory=dict)


def _tenant_user(request: Request) -> tuple[str | None, str | None]:
    return getattr(request.state, "tenant_id", None), getattr(request.state, "user_id", None)


def _require_supabase() -> None:
    if not is_configured():
        raise HTTPException(status_code=503, detail="Supabase operations env is not configured.")


@router.get("/usage")
def get_usage(request: Request):
    _require_supabase()
    tenant_id, _ = _tenant_user(request)
    try:
        return summarize_usage(tenant_id)
    except SupabaseNotConfigured as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/audit")
def get_audit_logs(request: Request, limit: int = 100):
    _require_supabase()
    tenant_id, _ = _tenant_user(request)
    try:
        return {"items": select_rows("audit_logs", tenant_id, limit=max(1, min(limit, 500)))}
    except SupabaseNotConfigured as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/incident-actions")
def get_incident_actions(request: Request, limit: int = 100):
    _require_supabase()
    tenant_id, _ = _tenant_user(request)
    try:
        return {"items": select_rows("incident_actions", tenant_id, limit=max(1, min(limit, 500)))}
    except SupabaseNotConfigured as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/incident-actions")
def create_incident_action(req: IncidentActionRequest, request: Request):
    _require_supabase()
    tenant_id, user_id = _tenant_user(request)
    try:
        action_row = insert_row(
            "incident_actions",
            {
                "tenant_id": tenant_id,
                "user_id": user_id,
                "incident_id": req.incident_id,
                "action": req.action,
                "status": req.status,
                "metadata": req.metadata,
            },
        )
        audit_row = insert_row(
            "audit_logs",
            {
                "tenant_id": tenant_id,
                "user_id": user_id,
                "action": f"incident.{req.status}",
                "resource_type": "incident",
                "resource_id": req.incident_id,
                "metadata": {"action": req.action, **req.metadata},
            },
        )
    except SupabaseNotConfigured as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"status": "success", "incident_action": action_row, "audit_log": audit_row}
