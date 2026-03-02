from __future__ import annotations

from pathlib import Path

import pandas as pd
from fastapi import APIRouter

router = APIRouter(prefix="/metrics", tags=["metrics"])


PROJECT_ROOT = Path(__file__).resolve().parents[3]
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"
ANALYSIS_PATH = PROCESSED_DIR / "analiz_veri.csv"
LATEST_FULL_PATH = PROJECT_ROOT / "data" / "temiz_veri_final_latest.csv"


def _load_analysis_df() -> pd.DataFrame:
    return pd.read_csv(ANALYSIS_PATH, encoding="utf-8-sig")


def _load_full_df() -> pd.DataFrame:
    return pd.read_csv(LATEST_FULL_PATH, encoding="utf-8-sig")


@router.get("/overview")
def get_overview_metrics():
    """
    High-level KPIs for the executive dashboard, computed from the latest datasets.
    """
    anal = _load_analysis_df()
    full = _load_full_df()

    # Logistics: on-time vs late based on Late_delivery_risk flag
    late_rate = float(anal["Late_delivery_risk"].mean())
    on_time_rate = 1.0 - late_rate

    # Demand risk: volume share of volatile categories (high daily coefficient of variation)
    anal["order_date"] = pd.to_datetime(anal["order date (DateOrders)"])
    daily_cat = (
        anal.groupby([anal["order_date"].dt.date, "Category Name"])["Sales"]
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
    loss_mask = full.get("negative_profit_flag", 0) == 1
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

