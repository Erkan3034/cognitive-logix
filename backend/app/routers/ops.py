from __future__ import annotations

import json
import math
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from app.routers.metrics import get_model_health
from app.services.supabase_ops import SupabaseNotConfigured, insert_row, is_configured, select_rows, summarize_usage


router = APIRouter(prefix="/ops", tags=["ops"])


class IncidentActionRequest(BaseModel):
    incident_id: str
    action: str
    status: str = Field("approved", pattern="^(approved|dismissed|queued)$")
    metadata: dict[str, Any] = Field(default_factory=dict)


class RoutePoint(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)


class RouteIntelligenceRequest(BaseModel):
    origin: RoutePoint
    destination: RoutePoint
    shipping_mode: str = "Standard Class"
    base_late_risk_pct: float = Field(0.35, ge=0, le=1)


def _tenant_user(request: Request) -> tuple[str | None, str | None]:
    return getattr(request.state, "tenant_id", None), getattr(request.state, "user_id", None)


def _require_supabase() -> None:
    if not is_configured():
        raise HTTPException(status_code=503, detail="Supabase operations env is not configured.")


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _haversine_km(a: RoutePoint, b: RoutePoint) -> float:
    radius = 6371.0
    lat1 = math.radians(a.lat)
    lat2 = math.radians(b.lat)
    dlat = math.radians(b.lat - a.lat)
    dlng = math.radians(b.lng - a.lng)
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng / 2) ** 2
    return radius * 2 * math.atan2(math.sqrt(h), math.sqrt(1 - h))


def _fetch_json(url: str, timeout: float = 2.5) -> tuple[dict[str, Any] | None, str | None, float]:
    started = time.perf_counter()
    try:
        with urllib.request.urlopen(url, timeout=timeout) as response:
            payload = json.loads(response.read().decode("utf-8"))
            return payload, None, (time.perf_counter() - started) * 1000
    except (urllib.error.URLError, TimeoutError, ValueError, json.JSONDecodeError) as exc:
        return None, str(exc), (time.perf_counter() - started) * 1000


def _weather_signal(lat: float, lng: float) -> dict[str, Any]:
    query = urllib.parse.urlencode(
        {
            "latitude": round(lat, 4),
            "longitude": round(lng, 4),
            "current": "temperature_2m,precipitation,rain,snowfall,wind_speed_10m,weather_code",
            "timezone": "auto",
        }
    )
    payload, error, latency_ms = _fetch_json(f"https://api.open-meteo.com/v1/forecast?{query}")
    if error or not payload:
        return {
            "status": "warning",
            "latency_ms": round(latency_ms),
            "message": "Hava kaynağına ulaşılamadı.",
            "risk_bonus": 0.0,
            "current": None,
        }

    current = payload.get("current") or {}
    wind = float(current.get("wind_speed_10m") or 0)
    precipitation = float(current.get("precipitation") or 0)
    rain = float(current.get("rain") or 0)
    snow = float(current.get("snowfall") or 0)
    code = int(current.get("weather_code") or 0)
    weather_code_bonus = 0.04 if code >= 60 else 0.02 if code >= 45 else 0
    risk_bonus = min(0.28, precipitation * 0.025 + rain * 0.02 + snow * 0.08 + wind * 0.003 + weather_code_bonus)
    return {
        "status": "online",
        "latency_ms": round(latency_ms),
        "message": "Canlı hava sinyali alındı.",
        "risk_bonus": round(risk_bonus, 4),
        "current": current,
    }


def _connection_item(
    key: str,
    label: str,
    status: str,
    message: str,
    latency_ms: int | None = None,
    source: str = "Sistem",
) -> dict[str, Any]:
    return {
        "key": key,
        "label": label,
        "status": status,
        "message": message,
        "latency_ms": latency_ms,
        "source": source,
        "checked_at": _utc_now(),
    }


def _metadata(row: dict[str, Any]) -> dict[str, Any]:
    raw = row.get("metadata") or {}
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}
    return {}


@router.get("/usage")
def get_usage(request: Request):
    _require_supabase()
    tenant_id, _ = _tenant_user(request)
    try:
        return summarize_usage(tenant_id)
    except SupabaseNotConfigured as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/live-connections")
def get_live_connections(request: Request):
    items: list[dict[str, Any]] = []

    started = time.perf_counter()
    if is_configured():
        try:
            select_rows("usage_logs", getattr(request.state, "tenant_id", None), limit=1)
            items.append(
                _connection_item(
                    "supabase",
                    "Müşteri veri deposu",
                    "online",
                    "Tenant kayıtları okunabiliyor.",
                    round((time.perf_counter() - started) * 1000),
                    "Supabase",
                )
            )
        except Exception as exc:
            items.append(
                _connection_item(
                    "supabase",
                    "Müşteri veri deposu",
                    "warning",
                    f"Bağlantı sınaması başarısız: {exc}",
                    round((time.perf_counter() - started) * 1000),
                    "Supabase",
                )
            )
    else:
        items.append(_connection_item("supabase", "Müşteri veri deposu", "offline", "Bağlantı bilgisi eksik.", None, "Supabase"))

    started = time.perf_counter()
    try:
        health = get_model_health()
        ready = sum(1 for model in health.models if model.status == "ready")
        status = "online" if ready == len(health.models) else "warning"
        items.append(
            _connection_item(
                "models",
                "Model çalışma zamanı",
                status,
                f"{ready}/{len(health.models)} model hazır.",
                round((time.perf_counter() - started) * 1000),
                "Model servisi",
            )
        )
    except Exception as exc:
        items.append(_connection_item("models", "Model çalışma zamanı", "offline", str(exc), round((time.perf_counter() - started) * 1000), "Model servisi"))

    weather = _weather_signal(41.0082, 28.9784)
    items.append(
        _connection_item(
            "weather",
            "Canlı hava kaynağı",
            weather["status"],
            weather["message"],
            weather["latency_ms"],
            "Open-Meteo",
        )
    )

    online_count = sum(1 for item in items if item["status"] == "online")
    return {
        "checked_at": _utc_now(),
        "online_count": online_count,
        "total": len(items),
        "items": items,
    }


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


@router.get("/decision-impact")
def get_decision_impact(request: Request, limit: int = 250):
    _require_supabase()
    tenant_id, _ = _tenant_user(request)
    try:
        rows = select_rows("incident_actions", tenant_id, limit=max(1, min(limit, 500)))
    except SupabaseNotConfigured as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    multipliers = {"approved": 0.28, "queued": 0.12, "dismissed": 0.02}
    status_counts: dict[str, int] = {"approved": 0, "queued": 0, "dismissed": 0}
    by_type: dict[str, dict[str, Any]] = {}
    timeline: dict[str, dict[str, Any]] = {}
    total_impact = 0.0
    protected_value = 0.0

    for row in rows:
        status = str(row.get("status") or "queued")
        status_counts[status] = status_counts.get(status, 0) + 1
        metadata = _metadata(row)
        impact = float(metadata.get("impact_usd") or 0)
        protected = impact * multipliers.get(status, 0.08)
        total_impact += impact
        protected_value += protected
        typ = str(metadata.get("type") or "operation")
        by_type.setdefault(typ, {"type": typ, "count": 0, "impact_usd": 0.0, "protected_value_usd": 0.0})
        by_type[typ]["count"] += 1
        by_type[typ]["impact_usd"] += impact
        by_type[typ]["protected_value_usd"] += protected
        day = str(row.get("created_at") or "")[:10] or "unknown"
        timeline.setdefault(day, {"date": day, "count": 0, "protected_value_usd": 0.0})
        timeline[day]["count"] += 1
        timeline[day]["protected_value_usd"] += protected

    return {
        "total_decisions": len(rows),
        "status_counts": status_counts,
        "total_impact_usd": round(total_impact, 2),
        "protected_value_usd": round(protected_value, 2),
        "approval_rate": round(status_counts.get("approved", 0) / len(rows), 4) if rows else 0,
        "by_type": sorted(by_type.values(), key=lambda item: item["protected_value_usd"], reverse=True),
        "timeline": sorted(timeline.values(), key=lambda item: item["date"]),
        "recent": rows[:12],
    }


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


@router.post("/route-intelligence")
def route_intelligence(req: RouteIntelligenceRequest):
    distance_km = _haversine_km(req.origin, req.destination)
    midpoint_lat = (req.origin.lat + req.destination.lat) / 2
    midpoint_lng = (req.origin.lng + req.destination.lng) / 2
    weather = _weather_signal(midpoint_lat, midpoint_lng)

    mode = req.shipping_mode
    if mode == "Same Day":
        speed_kmh = 680
        mode_bonus = 0.04
        transport_type = "Hava"
    elif mode == "First Class":
        speed_kmh = 520
        mode_bonus = 0.02
        transport_type = "Hava"
    elif mode == "Second Class":
        speed_kmh = 58
        mode_bonus = 0.08
        transport_type = "Kara"
    else:
        speed_kmh = 64
        mode_bonus = 0.06
        transport_type = "Kara"

    distance_bonus = min(0.2, distance_km / 8500 * 0.2)
    weather_bonus = float(weather.get("risk_bonus") or 0)
    adjusted = max(0, min(0.98, req.base_late_risk_pct + distance_bonus + weather_bonus + mode_bonus - 0.03))
    eta_hours = distance_km / max(speed_kmh, 1)

    return {
        "origin": req.origin.model_dump(),
        "destination": req.destination.model_dump(),
        "distance_km": round(distance_km, 1),
        "eta_hours": round(eta_hours, 1),
        "transport_type": transport_type,
        "base_late_risk_pct": req.base_late_risk_pct,
        "adjusted_late_risk_pct": round(adjusted, 4),
        "risk_delta_pct": round(adjusted - req.base_late_risk_pct, 4),
        "signals": {
            "distance_bonus": round(distance_bonus, 4),
            "weather_bonus": round(weather_bonus, 4),
            "mode_bonus": round(mode_bonus, 4),
        },
        "weather": weather,
        "checked_at": _utc_now(),
    }
