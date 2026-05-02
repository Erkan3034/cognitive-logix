from __future__ import annotations

import logging
import time
from threading import Lock
from pathlib import Path
import pickle

import numpy as np
import pandas as pd
from fastapi import APIRouter

from app.models.metrics import (
    DriftResponse,
    DrilldownSkuResponse,
    IncidentResponse,
    ModelHealthResponse,
    MetricsOverviewResponse,
    RiskMapResponse,
    WhatIfScenarioRequest,
    WhatIfScenarioResponse,
    XaiResponse,
)
from app.ml.model_contract import ARTIFACT_VERSION

router = APIRouter(prefix="/metrics", tags=["metrics"])
logger = logging.getLogger(__name__)


PROJECT_ROOT = Path(__file__).resolve().parents[3]
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"
ANALYSIS_PATH = PROCESSED_DIR / "analiz_veri.csv"
LATEST_FULL_PATH = PROJECT_ROOT / "data" / "temiz_veri_final_latest.csv"
MODEL_DIR = PROJECT_ROOT / "backend" / "trained_models"


METRICS_CACHE_TTL_SECONDS = 60
_metrics_cache_lock = Lock()
_metrics_cache_payload: dict | None = None
_metrics_cache_signature: tuple | None = None
_metrics_cache_expires_at: float = 0.0


def _file_signature(path: Path) -> tuple[int, int]:
    stat = path.stat()
    return (stat.st_mtime_ns, stat.st_size)


def _current_data_signature() -> tuple[tuple[int, int], tuple[int, int]]:
    return (_file_signature(ANALYSIS_PATH), _file_signature(LATEST_FULL_PATH))


def _load_analysis_df() -> pd.DataFrame:
    return pd.read_csv(
        ANALYSIS_PATH,
        encoding="utf-8-sig",
        usecols=[
            "Late_delivery_risk",
            "order date (DateOrders)",
            "Category Name",
            "Sales",
            "Order Region",
            "Shipping Mode",
            "Product Card Id",
            "Product Name",
            "Order Id",
        ],
        parse_dates=["order date (DateOrders)"],
    )


def _load_full_df() -> pd.DataFrame:
    return pd.read_csv(
        LATEST_FULL_PATH,
        encoding="utf-8-sig",
        usecols=[
            "negative_profit_flag",
            "Sales_winsor",
            "order_date",
            "Late_delivery_risk",
            "Order Status",
            "Order Region",
            "Shipping Mode",
            "Category Name",
        ],
        parse_dates=["order_date"],
    )


def _load_drilldown_df() -> pd.DataFrame:
    return pd.read_csv(
        ANALYSIS_PATH,
        encoding="utf-8-sig",
        usecols=[
            "Order Region",
            "Shipping Mode",
            "Category Name",
            "Product Card Id",
            "Product Name",
            "Sales",
            "Late_delivery_risk",
            "Order Id",
        ],
    )


def _coerce_metrics_payload(payload: dict) -> MetricsOverviewResponse:
    return MetricsOverviewResponse(**payload)


def _build_scenario_drivers(scenario: WhatIfScenarioRequest) -> list[str]:
    drivers: list[str] = []
    if scenario.port_closed:
        drivers.append("X Limani kapanmasi")
    if scenario.demand_surge_pct > 0:
        drivers.append(f"talep artisi (%{scenario.demand_surge_pct:.0f})")
    if scenario.supplier_strike != "none":
        drivers.append(f"tedarikci grevi ({scenario.supplier_strike})")
    return drivers


def _build_xai_explanations(
    scenario: WhatIfScenarioRequest,
) -> dict[str, str]:
    drivers = _build_scenario_drivers(scenario)
    scenario_text = (
        f" Senaryo etkisi: {', '.join(drivers)}." if drivers else ""
    )

    return {
        "on_time_delivery_pct": (
            "Veri analizi: Zamaninda teslimat orani Late_delivery_risk alaninin "
            f"tersi olarak son islem verisinden hesaplandi.{scenario_text}"
        ),
        "late_delivery_risk_pct": (
            "Veri analizi: Gecikme riski bolge, tasima modu ve gecmis teslimat "
            f"bayraklarinin dagilimiyle olculdu.{scenario_text}"
        ),
        "demand_risk_pct": (
            "AI analizi: Kategori bazli gunluk oynaklik (CV) ve bolgesel siparis trendi "
            f"birlestirilerek talep riski uretildi.{scenario_text}"
        ),
        "financial_exposure_usd": (
            "AI analizi: Negatif kar bayragi, siparis tutari dagilimi ve anomali "
            f"sinyallerinden finansal maruziyet tahmin edildi.{scenario_text}"
        ),
    }


def _apply_scenario(
    base_metrics: MetricsOverviewResponse,
    scenario: WhatIfScenarioRequest,
) -> tuple[MetricsOverviewResponse, dict[str, float]]:
    strike_late_boost = (
        0.15 if scenario.supplier_strike == "global" else 0.07 if scenario.supplier_strike == "local" else 0.0
    )
    port_late_boost = 0.11 if scenario.port_closed else 0.0
    demand_boost = (scenario.demand_surge_pct / 100.0) * 0.4
    exposure_factor = (
        1
        + (0.08 if scenario.port_closed else 0.0)
        + (scenario.demand_surge_pct / 100.0) * 0.6
        + (0.25 if scenario.supplier_strike == "global" else 0.1 if scenario.supplier_strike == "local" else 0.0)
    )

    late = max(0.0, min(0.98, base_metrics.late_delivery_risk_pct + strike_late_boost + port_late_boost))
    on_time = max(0.02, min(1.0, 1.0 - late))
    demand_risk = max(0.0, min(0.98, base_metrics.demand_risk_pct + demand_boost))
    exposure = max(0.0, base_metrics.financial_exposure_usd * exposure_factor)

    simulated = MetricsOverviewResponse(
        on_time_delivery_pct=on_time,
        late_delivery_risk_pct=late,
        demand_risk_pct=demand_risk,
        demand_risk_categories=base_metrics.demand_risk_categories,
        financial_exposure_usd=exposure,
        loss_making_orders=base_metrics.loss_making_orders,
    )

    factors = {
        "strike_late_boost": strike_late_boost,
        "port_late_boost": port_late_boost,
        "demand_boost": demand_boost,
        "exposure_factor": exposure_factor,
    }
    return simulated, factors


def _monte_carlo_scenario(
    base_metrics: MetricsOverviewResponse,
    scenario: WhatIfScenarioRequest,
    runs: int = 4000,
) -> tuple[MetricsOverviewResponse, dict[str, float]]:
    rng = np.random.default_rng(42)
    strike_mean = 0.15 if scenario.supplier_strike == "global" else 0.07 if scenario.supplier_strike == "local" else 0.0
    port_mean = 0.11 if scenario.port_closed else 0.0
    demand_mean = (scenario.demand_surge_pct / 100.0) * 0.4

    late_samples = (
        base_metrics.late_delivery_risk_pct
        + rng.normal(port_mean, 0.025, runs)
        + rng.normal(strike_mean, 0.03, runs)
    )
    demand_samples = base_metrics.demand_risk_pct + rng.normal(demand_mean, 0.02, runs)
    exposure_factor = (
        1
        + rng.normal(0.08 if scenario.port_closed else 0.0, 0.02, runs)
        + rng.normal((scenario.demand_surge_pct / 100.0) * 0.6, 0.04, runs)
        + rng.normal(0.25 if scenario.supplier_strike == "global" else 0.1 if scenario.supplier_strike == "local" else 0.0, 0.035, runs)
    )

    late_mean = float(np.clip(late_samples, 0.0, 0.98).mean())
    demand_mean_out = float(np.clip(demand_samples, 0.0, 0.98).mean())
    exposure_mean = float(np.maximum(0.0, base_metrics.financial_exposure_usd * exposure_factor).mean())

    simulated = MetricsOverviewResponse(
        on_time_delivery_pct=max(0.02, min(1.0, 1.0 - late_mean)),
        late_delivery_risk_pct=late_mean,
        demand_risk_pct=demand_mean_out,
        demand_risk_categories=base_metrics.demand_risk_categories,
        financial_exposure_usd=exposure_mean,
        loss_making_orders=base_metrics.loss_making_orders,
    )
    factors = {
        "runs": float(runs),
        "late_risk_p10": float(np.quantile(np.clip(late_samples, 0.0, 0.98), 0.10)),
        "late_risk_p90": float(np.quantile(np.clip(late_samples, 0.0, 0.98), 0.90)),
        "exposure_p90": float(np.quantile(np.maximum(0.0, base_metrics.financial_exposure_usd * exposure_factor), 0.90)),
    }
    return simulated, factors


def _filter_equals_case_insensitive(df: pd.DataFrame, column: str, value: str | None) -> pd.DataFrame:
    if not value:
        return df
    return df[df[column].astype(str).str.casefold() == value.casefold()]


def _compute_overview_metrics() -> dict:
    anal = _load_analysis_df()
    full = _load_full_df()

    # Logistics: on-time vs late based on Late_delivery_risk flag
    late_rate = float(anal["Late_delivery_risk"].mean())
    on_time_rate = 1.0 - late_rate

    # Demand risk: volume share of volatile categories (high daily coefficient of variation)
    daily_cat = (
        anal.groupby([anal["order date (DateOrders)"].dt.date, "Category Name"])["Sales"]
        .sum()
        .reset_index()
    )

    stats = (
        daily_cat.groupby("Category Name")["Sales"]
        .agg(["mean", "std"])
        .reset_index()
    )
    stats["cv"] = stats["std"] / stats["mean"].replace(0, pd.NA)
    volatile = stats[stats["cv"] > 0.8]["Category Name"]

    total_sales = float(anal["Sales"].sum())
    volatile_sales = float(
        anal[anal["Category Name"].isin(volatile)]["Sales"].sum()
    )
    demand_risk_pct = (volatile_sales / total_sales) if total_sales > 0 else 0.0
    demand_categories = int(len(volatile))

    # Financial exposure: negative profit and suspected fraud
    loss_mask = full["negative_profit_flag"] == 1
    loss_orders = int(loss_mask.sum())
    exposure = float(full.loc[loss_mask, "Sales_winsor"].sum())

    return {
        "on_time_delivery_pct": on_time_rate,
        "late_delivery_risk_pct": late_rate,
        "demand_risk_pct": demand_risk_pct,
        "demand_risk_categories": demand_categories,
        "financial_exposure_usd": exposure,
        "loss_making_orders": loss_orders,
    }


def _get_or_refresh_metrics_cache(force_refresh: bool = False) -> tuple[dict, bool]:
    global _metrics_cache_payload
    global _metrics_cache_signature
    global _metrics_cache_expires_at

    now = time.time()
    signature = _current_data_signature()

    with _metrics_cache_lock:
        if (
            not force_refresh
            and _metrics_cache_payload is not None
            and _metrics_cache_signature == signature
            and now < _metrics_cache_expires_at
        ):
            return _metrics_cache_payload, True

    payload = _compute_overview_metrics()

    with _metrics_cache_lock:
        _metrics_cache_payload = payload
        _metrics_cache_signature = signature
        _metrics_cache_expires_at = now + METRICS_CACHE_TTL_SECONDS

    return payload, False


def warmup_overview_metrics(force_refresh: bool = False) -> None:
    payload, cache_hit = _get_or_refresh_metrics_cache(force_refresh=force_refresh)
    logger.info(
        "metrics.overview warmup complete | cache_hit=%s | kpi_count=%s",
        cache_hit,
        len(payload),
    )


@router.get("/overview")
def get_overview_metrics() -> MetricsOverviewResponse:
    """
    High-level KPIs for the executive dashboard, computed from the latest datasets.
    """
    started = time.perf_counter()
    payload, cache_hit = _get_or_refresh_metrics_cache(force_refresh=False)
    elapsed_ms = (time.perf_counter() - started) * 1000
    logger.info(
        "GET /metrics/overview | cache_hit=%s | elapsed_ms=%.2f",
        cache_hit,
        elapsed_ms,
    )
    return _coerce_metrics_payload(payload)


@router.get("/xai", response_model=XaiResponse)
def get_xai_explanations(
    port_closed: bool = False,
    demand_surge_pct: float = 0.0,
    supplier_strike: str = "none",
) -> XaiResponse:
    scenario = WhatIfScenarioRequest(
        port_closed=port_closed,
        demand_surge_pct=demand_surge_pct,
        supplier_strike=supplier_strike,
    )
    explanations = _build_xai_explanations(scenario)
    return XaiResponse(
        explanations=explanations,
        scenario_drivers=_build_scenario_drivers(scenario),
    )


@router.post("/simulate", response_model=WhatIfScenarioResponse)
def simulate_metrics(req: WhatIfScenarioRequest) -> WhatIfScenarioResponse:
    base_payload, _ = _get_or_refresh_metrics_cache(force_refresh=False)
    base_metrics = _coerce_metrics_payload(base_payload)
    simulated, factors = _monte_carlo_scenario(base_metrics, req)
    return WhatIfScenarioResponse(
        metrics=simulated,
        explanations=_build_xai_explanations(req),
        scenario_drivers=_build_scenario_drivers(req),
        applied_factors=factors,
    )


@router.get("/risk-map", response_model=RiskMapResponse)
def get_risk_map(limit: int = 12) -> RiskMapResponse:
    df = _load_analysis_df()
    grouped = (
        df.groupby(["Order Region", "Shipping Mode", "Category Name", "Product Card Id"], dropna=False)
        .agg(
            late_risk_pct=("Late_delivery_risk", "mean"),
            financial_exposure_usd=("Sales", "sum"),
            order_count=("Order Id", "nunique"),
        )
        .reset_index()
        .sort_values(["late_risk_pct", "financial_exposure_usd"], ascending=[False, False])
        .head(max(1, min(limit, 50)))
    )
    items = []
    for idx, row in enumerate(grouped.itertuples(index=False), start=1):
        product_id = getattr(row, "_3")
        items.append(
            {
                "id": f"risk-{idx}",
                "order_region": str(getattr(row, "_0")),
                "shipping_mode": str(getattr(row, "_1")),
                "category_name": str(getattr(row, "_2")),
                "late_risk_pct": float(row.late_risk_pct),
                "financial_exposure_usd": float(row.financial_exposure_usd),
                "order_count": int(row.order_count),
                "sku": f"SKU-{int(product_id)}" if pd.notna(product_id) else "SKU-UNKNOWN",
            }
        )
    return RiskMapResponse(total=len(items), items=items)


@router.get("/incidents", response_model=IncidentResponse)
def get_incidents(limit: int = 8) -> IncidentResponse:
    risk_map = get_risk_map(limit=limit).items
    full = _load_full_df()
    incidents = []
    for item in risk_map:
        severity = "critical" if item.late_risk_pct >= 0.8 else "high" if item.late_risk_pct >= 0.65 else "medium"
        incidents.append(
            {
                "id": item.id,
                "type": "logistics",
                "severity": severity,
                "title": f"{item.order_region} / {item.shipping_mode} lane delay risk",
                "description": (
                    f"{item.category_name} segment has {item.late_risk_pct * 100:.1f}% late-delivery risk "
                    f"across {item.order_count} orders."
                ),
                "impact_usd": item.financial_exposure_usd,
                "confidence": min(0.99, max(0.55, item.late_risk_pct)),
                "recommended_action": "Inspect lane, upgrade service level for priority orders, and notify customer success.",
                "drilldown_params": {
                    "order_region": item.order_region,
                    "shipping_mode": item.shipping_mode,
                    "category": item.category_name,
                    "sku": item.sku,
                },
            }
        )

    fraud = full[full["Order Status"] == "SUSPECTED_FRAUD"]
    if not fraud.empty:
        exposure = float(fraud["Sales_winsor"].sum())
        incidents.append(
            {
                "id": "fraud-exposure",
                "type": "fraud",
                "severity": "critical" if exposure > 250_000 else "high",
                "title": "Suspected fraud exposure cluster",
                "description": f"{len(fraud)} suspected-fraud orders carry ${exposure:,.0f} gross exposure.",
                "impact_usd": exposure,
                "confidence": 0.92,
                "recommended_action": "Hold fulfillment for high-value suspected-fraud orders and route them to review.",
                "drilldown_params": {},
            }
        )

    loss = full[full["negative_profit_flag"] == 1]
    if not loss.empty:
        exposure = float(loss["Sales_winsor"].sum())
        incidents.append(
            {
                "id": "loss-making-orders",
                "type": "inventory",
                "severity": "high" if exposure > 500_000 else "medium",
                "title": "Negative-profit order exposure",
                "description": f"{len(loss)} loss-making orders represent ${exposure:,.0f} revenue at risk.",
                "impact_usd": exposure,
                "confidence": 0.88,
                "recommended_action": "Review discount, shipping-cost, and return-policy thresholds before approval.",
                "drilldown_params": {},
            }
        )

    ranked = sorted(incidents, key=lambda item: item["impact_usd"], reverse=True)[: max(1, min(limit, 20))]
    return IncidentResponse(total=len(ranked), items=ranked)


def _psi(expected: pd.Series, actual: pd.Series, buckets: int = 10) -> float:
    expected = pd.to_numeric(expected, errors="coerce").dropna()
    actual = pd.to_numeric(actual, errors="coerce").dropna()
    if len(expected) < buckets or len(actual) < buckets:
        return 0.0
    quantiles = np.unique(np.quantile(expected, np.linspace(0, 1, buckets + 1)))
    if len(quantiles) < 3:
        return 0.0
    e_counts, _ = np.histogram(expected, bins=quantiles)
    a_counts, _ = np.histogram(actual, bins=quantiles)
    e_pct = np.maximum(e_counts / max(e_counts.sum(), 1), 0.0001)
    a_pct = np.maximum(a_counts / max(a_counts.sum(), 1), 0.0001)
    return float(np.sum((a_pct - e_pct) * np.log(a_pct / e_pct)))


@router.get("/drift", response_model=DriftResponse)
def get_data_drift() -> DriftResponse:
    full = _load_full_df().sort_values("order_date")
    midpoint = len(full) // 2
    old = full.iloc[:midpoint]
    recent = full.iloc[midpoint:]
    metrics = []
    for feature in ["Sales_winsor", "Late_delivery_risk", "negative_profit_flag"]:
        psi = _psi(old[feature], recent[feature])
        status = "drift" if psi >= 0.25 else "watch" if psi >= 0.10 else "stable"
        metrics.append({"feature": feature, "psi": psi, "status": status})
    return DriftResponse(window_a_rows=len(old), window_b_rows=len(recent), metrics=metrics)


def _read_model_health(name: str, filename: str) -> dict:
    path = MODEL_DIR / filename
    if not path.exists():
        return {"name": name, "status": "missing", "error": f"{filename} not found"}
    try:
        with path.open("rb") as f:
            artifact = pickle.load(f)
        if not isinstance(artifact, dict) or artifact.get("artifact_version") != ARTIFACT_VERSION:
            return {
                "name": name,
                "status": "invalid",
                "error": f"{filename} does not contain artifact_version={ARTIFACT_VERSION}",
            }
        return {
            "name": name,
            "status": "ready",
            "model_version": artifact.get("model_version"),
            "model_type": artifact.get("model_type"),
            "artifact_created_at": artifact.get("artifact_created_at"),
            "validation_metrics": artifact.get("validation_metrics", {}),
        }
    except Exception as exc:
        return {"name": name, "status": "invalid", "error": str(exc)}


@router.get("/model-health", response_model=ModelHealthResponse)
def get_model_health() -> ModelHealthResponse:
    models = [
        _read_model_health("Delay Risk", "logistics_model.pkl"),
        _read_model_health("Demand Forecast", "demand_model.pkl"),
        _read_model_health("Fraud & Financial Risk", "fraud_model.pkl"),
    ]
    return ModelHealthResponse(models=models, drift=get_data_drift())


@router.get("/drilldown-skus", response_model=DrilldownSkuResponse)
def get_drilldown_skus(
    order_region: str | None = None,
    shipping_mode: str | None = None,
    category: str | None = None,
    limit: int = 10,
) -> DrilldownSkuResponse:
    df = _load_drilldown_df()
    df = _filter_equals_case_insensitive(df, "Order Region", order_region)
    df = _filter_equals_case_insensitive(df, "Shipping Mode", shipping_mode)
    df = _filter_equals_case_insensitive(df, "Category Name", category)

    grouped = (
        df.groupby([
            "Product Card Id",
            "Product Name",
            "Order Region",
            "Shipping Mode",
            "Category Name",
        ], dropna=False)
        .agg(
            late_risk_pct=("Late_delivery_risk", "mean"),
            avg_sales_usd=("Sales", "mean"),
            sample_order_id=("Order Id", "first"),
        )
        .reset_index()
        .sort_values(["late_risk_pct", "avg_sales_usd"], ascending=[False, False])
    )

    total = int(len(grouped))
    safe_limit = max(1, min(limit, 50))
    sliced = grouped.head(safe_limit)

    items = []
    for row in sliced.itertuples(index=False):
        product_id = getattr(row, "_0")
        product_name = getattr(row, "_1")
        region = getattr(row, "_2")
        mode = getattr(row, "_3")
        category_name = getattr(row, "_4")
        late_risk_pct = float(getattr(row, "_5"))
        avg_sales_usd = float(getattr(row, "_6"))
        sample_order_id = int(getattr(row, "_7"))

        sku = f"SKU-{int(product_id)}" if pd.notna(product_id) else "SKU-UNKNOWN"
        items.append(
            {
                "sku": sku,
                "product_name": str(product_name) if pd.notna(product_name) else "Unknown Product",
                "order_region": str(region) if pd.notna(region) else "Unknown Region",
                "shipping_mode": str(mode) if pd.notna(mode) else "Unknown Mode",
                "category_name": str(category_name) if pd.notna(category_name) else "Unknown Category",
                "late_risk_pct": late_risk_pct,
                "avg_sales_usd": avg_sales_usd,
                "sample_order_id": sample_order_id,
            }
        )

    return DrilldownSkuResponse(total=total, items=items)

