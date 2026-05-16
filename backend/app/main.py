import asyncio
import logging
import os
from pathlib import Path

from dotenv import load_dotenv


_env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(_env_path)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool

from app.api.ingestion import router as ingestion_router
from app.middleware.tenant_context import TenantUsageMiddleware
from app.ml.model_contract import ARTIFACT_VERSION
from app.routers.forecast import router as forecast_router
from app.routers.fraud import router as fraud_router
from app.routers.metrics import get_model_health
from app.routers.metrics import router as metrics_router
from app.routers.metrics import warmup_overview_metrics, _get_cached_analysis_base, _get_cached_full_base, _build_risk_map
from app.routers.api_keys import router as api_keys_router
from app.routers.ops import router as ops_router
from app.routers.predict import router as predict_router
from app.routers.billing import router as billing_router
from app.services.supabase_ops import is_configured as supabase_is_configured

app = FastAPI(title="Cognitive Logix API", version="1.0.0")
logger = logging.getLogger(__name__)

METRICS_REFRESH_INTERVAL_SECONDS = 30


def _allowed_origins() -> list[str]:
    if os.getenv("ALLOW_ALL_CORS", "false").lower() == "true":
        return ["*"]
    raw = os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:5173,http://localhost:3000")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


app.add_middleware(TenantUsageMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict_router)
app.include_router(forecast_router)
app.include_router(fraud_router)
app.include_router(metrics_router)
app.include_router(ingestion_router)
app.include_router(ops_router)
app.include_router(api_keys_router)
app.include_router(billing_router)


async def _periodic_metrics_refresh_task() -> None:
    while True:
        await asyncio.sleep(METRICS_REFRESH_INTERVAL_SECONDS)
        try:
            await run_in_threadpool(warmup_overview_metrics, False)
        except Exception:
            logger.exception("Periodic metrics warm-up failed")


@app.on_event("startup")
async def on_startup() -> None:

    try:
        await run_in_threadpool(_get_cached_analysis_base)
        await run_in_threadpool(_get_cached_full_base)
        logger.info("DataFrame caches warmed up at startup")
    except Exception:
        logger.exception("Startup DataFrame cache warm-up failed")

    try:
        await run_in_threadpool(warmup_overview_metrics, True)
    except Exception:
        logger.exception("Startup metrics warm-up failed")

    try:
        await run_in_threadpool(_build_risk_map, 12, None)
        logger.info("Risk-map cache warmed up at startup")
    except Exception:
        logger.exception("Startup risk-map warm-up failed")
    app.state.metrics_refresh_task = asyncio.create_task(_periodic_metrics_refresh_task())


@app.on_event("shutdown")
async def on_shutdown() -> None:
    task = getattr(app.state, "metrics_refresh_task", None)
    if task is not None:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass


@app.get("/health")
def health():
    return {
        "status": "ok",
        "artifact_version": ARTIFACT_VERSION,
        "supabase_configured": supabase_is_configured(),
    }


@app.get("/ready")
def ready():
    health_data = get_model_health()
    model_ready = all(model.status == "ready" for model in health_data.models)
    return {
        "ready": model_ready and supabase_is_configured(),
        "models_ready": model_ready,
        "supabase_configured": supabase_is_configured(),
        "artifact_version": ARTIFACT_VERSION,
        "models": [
            model.model_dump() if hasattr(model, "model_dump") else model.dict()
            for model in health_data.models
        ],
    }


@app.get("/")
def root():
    return {
        "message": "Cognitive Logix Supply Chain Intelligence API",
        "version": "1.0.0",
        "artifact_version": ARTIFACT_VERSION,
    }


@app.get("/api")
def api_root():
    return {
        "message": "Cognitive Logix API is ready.",
        "endpoints": {
            "/predict": "Late delivery risk scoring.",
            "/forecast": "Demand forecasting and inventory planning.",
            "/fraud": "Fraud and anomaly risk scoring.",
            "/metrics": "Operational intelligence metrics.",
            "/ops": "SaaS usage, audit and incident action operations.",
        },
    }
