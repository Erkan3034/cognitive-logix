from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.services.supabase_ops import get_supabase_admin, is_configured

router = APIRouter(prefix="/api/v1/billing", tags=["billing"])

PLAN_LIMITS = {
    "free": 100,
    "pro": 10000,
    "enterprise": 9999999,
}
BILLABLE_ENDPOINT_PREFIXES = (
    "/predict",
    "/forecast",
    "/fraud",
    "/metrics/simulate",
    "/api/v1/ingest/csv-preview",
    "/api/v1/ingest/confirm-mapping",
    "/api/v1/ingest/webhook",
)

class OnboardRequest(BaseModel):
    company_name: str
    user_id: str

class UpgradeRequest(BaseModel):
    plan: str


def _require_user(request: Request) -> str:
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required.")
    return user_id


@router.post("/onboard")
def onboard_user(payload: OnboardRequest):
    if not is_configured():
        raise HTTPException(status_code=503, detail="Supabase is not configured.")

    try:
        sb = get_supabase_admin()
        
        # 0. Kullanıcının zaten bir tenant'ı var mı kontrol et
        profile_resp = sb.table("profiles").select("tenant_id").eq("id", payload.user_id).execute()
        profile_data = getattr(profile_resp, "data", [])
        
        if profile_data and profile_data[0].get("tenant_id"):
            # Zaten tenant_id atanmış, yenisini oluşturmaya gerek yok
            existing_tenant_id = profile_data[0]["tenant_id"]
            return {
                "status": "success",
                "tenant_id": existing_tenant_id,
                "plan": "free",
                "message": "User already onboarded."
            }
            
        # 1. Tenant oluştur
        tenant_resp = sb.table("tenants").insert({
            "name": payload.company_name,
            "plan": "free"
        }).execute()
        
        tenant_data = getattr(tenant_resp, "data", [])
        if not tenant_data:
            raise HTTPException(status_code=500, detail="Failed to create tenant: Empty response")
            
        tenant_id = tenant_data[0]["id"]
        
        # 2. Profili güncelle (user'ı tenant'a bağla)
        sb.table("profiles").update({
            "tenant_id": tenant_id
        }).eq("id", payload.user_id).execute()
        
        return {
            "status": "success",
            "tenant_id": tenant_id,
            "plan": "free",
            "message": "Onboarding successful. Free plan activated."
        }
    except Exception as e:
        import traceback
        print("Onboard Error:", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Onboard error: {str(e)}")


@router.get("/status")
def get_billing_status(request: Request):
    """
    Kullanıcının mevcut planını, limitini ve bu ayki kullanım miktarını döner.
    """
    if not is_configured():
        raise HTTPException(status_code=503, detail="Supabase is not configured.")
        
    tenant_id = getattr(request.state, "tenant_id", None)
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context is missing.")
        
    sb = get_supabase_admin()
    
    # 1. Tenant planını al
    tenant_resp = sb.table("tenants").select("plan").eq("id", tenant_id).single().execute()
    tenant_data = getattr(tenant_resp, "data", {})
    current_plan = tenant_data.get("plan", "free")
    limit = PLAN_LIMITS.get(current_plan, 100)
    
    # 2. Bu ayki kullanım miktarını say
    import datetime
    first_day_of_month = datetime.datetime.now(datetime.timezone.utc).replace(day=1, hour=0, minute=0, second=0).isoformat()
    
    usage_resp = (
        sb.table("usage_logs")
        .select("endpoint")
        .eq("tenant_id", tenant_id)
        .gte("created_at", first_day_of_month)
        .limit(10000)
        .execute()
    )
    usage_rows = getattr(usage_resp, "data", None) or []
    used_count = sum(
        1 for row in usage_rows if str(row.get("endpoint", "")).startswith(BILLABLE_ENDPOINT_PREFIXES)
    )
    
    return {
        "plan": current_plan,
        "limit": limit,
        "used": used_count,
        "remaining": max(0, limit - used_count)
    }


@router.post("/upgrade")
def upgrade_plan(payload: UpgradeRequest, request: Request):
    """
    (SİMÜLE) Ödeme başarılı olmuş gibi tenant'ın planını günceller.
    """
    if not is_configured():
        raise HTTPException(status_code=503, detail="Supabase is not configured.")
        
    tenant_id = getattr(request.state, "tenant_id", None)
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context is missing.")
        
    new_plan = payload.plan.lower()
    if new_plan not in PLAN_LIMITS:
        raise HTTPException(status_code=400, detail="Invalid plan selected.")
        
    sb = get_supabase_admin()
    
    # Planı güncelle
    sb.table("tenants").update({
        "plan": new_plan
    }).eq("id", tenant_id).execute()
    
    return {
        "status": "success",
        "message": f"Successfully upgraded to {new_plan} plan.",
        "new_plan": new_plan
    }
