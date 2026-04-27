import asyncio
import logging

from fastapi import FastAPI
from starlette.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware

from app.routers.forecast import router as forecast_router
from app.routers.fraud import router as fraud_router
from app.routers.metrics import router as metrics_router
from app.routers.metrics import warmup_overview_metrics
from app.routers.predict import router as predict_router

app = FastAPI(title="Cognitive Logix API", version="0.1.0")
logger = logging.getLogger(__name__)

METRICS_REFRESH_INTERVAL_SECONDS = 30

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict_router)
app.include_router(forecast_router)
app.include_router(fraud_router)
app.include_router(metrics_router)


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
        await run_in_threadpool(warmup_overview_metrics, True)
    except Exception:
        logger.exception("Startup metrics warm-up failed")
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
    return {"status": "ok NO PROBLEM :) "}


@app.get("/")
def root():
    return {
        "message": "Cognitive Logix - Bilişsel Tedarik Zinciri Dijital İkizi API",
        "version": "0.1.0",
        "Proudly Developed By": "ERKAN TURGUT",
    }

@app.get("/api")
def api_root():
    return {
        "message": "Welcome to the Cognitive Logix API! Explore the endpoints for forecasting, fraud detection, and more.",
        "endpoints": {
            "/predict": "Make predictions based on input data.",
            "/forecast": "Get forecasts for various metrics.",
            "/fraud": "Detect potential fraud in transactions.",
            "/metrics": "Access performance metrics and insights."
        }
    }
