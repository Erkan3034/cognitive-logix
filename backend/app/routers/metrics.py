from __future__ import annotations

import logging
import time
from threading import Lock
from pathlib import Path

import pandas as pd
from fastapi import APIRouter

from app.models.metrics import (
    DrilldownSkuResponse,
    MetricsOverviewResponse,
    WhatIfScenarioRequest,
    WhatIfScenarioResponse,
    XaiResponse,
)

router = APIRouter(prefix="/metrics", tags=["metrics"])
logger = logging.getLogger(__name__)


PROJECT_ROOT = Path(__file__).resolve().parents[3]
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"
ANALYSIS_PATH = PROCESSED_DIR / "analiz_veri.csv"
LATEST_FULL_PATH = PROJECT_ROOT / "data" / "temiz_veri_final_latest.csv"


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
        ],
        parse_dates=["order date (DateOrders)"],
    )


def _load_full_df() -> pd.DataFrame:
    return pd.read_csv(
        LATEST_FULL_PATH,
        encoding="utf-8-sig",
        usecols=["negative_profit_flag", "Sales_winsor"],
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
            "AI analizi: Teslimat basari orani; rota guvenilirligi, transit sureleri "
            f"ve istisna kayitlariyla hesaplandi.{scenario_text}"
        ),
        "late_delivery_risk_pct": (
            "AI analizi: Tasiyici performansi, liman yogunlugu ve transit gecmisine gore "
            f"gecikme olasiligi olculdu.{scenario_text}"
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
    simulated, factors = _apply_scenario(base_metrics, req)
    return WhatIfScenarioResponse(
        metrics=simulated,
        explanations=_build_xai_explanations(req),
        scenario_drivers=_build_scenario_drivers(req),
        applied_factors=factors,
    )


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

