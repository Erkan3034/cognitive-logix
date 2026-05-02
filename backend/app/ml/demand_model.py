from __future__ import annotations

from datetime import timedelta
from pathlib import Path
from statistics import NormalDist
from typing import Optional
import math
import pickle

import numpy as np
import pandas as pd

from app.ml.model_contract import require_v2_artifact
from app.models.forecast import ForecastRequest, ForecastResponse, ForecastedPoint


_DEMAND_ARTIFACT = None


def _load_artifact() -> dict:
    global _DEMAND_ARTIFACT
    if _DEMAND_ARTIFACT is None:
        model_path = Path(__file__).resolve().parents[2] / "trained_models" / "demand_model.pkl"
        if not model_path.exists():
            raise FileNotFoundError(
                f"Trained demand model not found at {model_path}. "
                "Run notebooks/module_b_demand/train_demand_model.py first."
            )
        with model_path.open("rb") as f:
            _DEMAND_ARTIFACT = require_v2_artifact(pickle.load(f), "demand")
    return _DEMAND_ARTIFACT


def _filter_history(history: pd.DataFrame, req: ForecastRequest) -> tuple[pd.DataFrame, str]:
    filtered = history.copy()
    level = "total"

    if req.market:
        filtered = filtered[filtered["Market"].astype(str).str.casefold() == req.market.casefold()]
        level = "market"
    if req.order_region:
        filtered = filtered[filtered["Order Region"].astype(str).str.casefold() == req.order_region.casefold()]
        level = "region"
    if req.category:
        filtered = filtered[filtered["Category Name"].astype(str).str.casefold() == req.category.casefold()]
        level = "category"
    if req.sku:
        sku = req.sku.replace("SKU-", "")
        filtered = filtered[filtered["Product Card Id"].astype(str).str.casefold() == sku.casefold()]
        level = "sku"

    return filtered, level


def _segment_values(history: pd.DataFrame, req: ForecastRequest) -> dict[str, str]:
    def value_or_mode(column: str, requested: Optional[str]) -> str:
        if requested:
            if column == "Product Card Id":
                return requested.replace("SKU-", "")
            return requested
        if history.empty:
            return "Unknown"
        return str(history[column].mode().iloc[0])

    return {
        "Market": value_or_mode("Market", req.market),
        "Order Region": value_or_mode("Order Region", req.order_region),
        "Category Name": value_or_mode("Category Name", req.category),
        "Product Card Id": value_or_mode("Product Card Id", req.sku),
    }


def _future_frame(artifact: dict, req: ForecastRequest, history: pd.DataFrame) -> pd.DataFrame:
    first_day = pd.Timestamp(artifact["first_day"])
    last_day = pd.Timestamp(artifact["last_day"])
    segment = _segment_values(history, req)
    days = [last_day + timedelta(days=i) for i in range(1, req.horizon + 1)]

    frame = pd.DataFrame({"ds": days})
    frame["day_index"] = (frame["ds"] - first_day).dt.days.astype(float)
    frame["dow"] = frame["ds"].dt.weekday.astype(int)
    frame["month"] = frame["ds"].dt.month.astype(int)
    frame["quarter"] = frame["ds"].dt.quarter.astype(int)
    frame["is_weekend"] = (frame["dow"] >= 5).astype(int)
    for column, value in segment.items():
        frame[column] = str(value)
    for col in artifact["categorical_features"]:
        frame[col] = frame[col].astype("category")
    return frame


def _daily_series(history: pd.DataFrame) -> pd.Series:
    if history.empty:
        return pd.Series(dtype=float)
    series = history.copy()
    series["ds"] = pd.to_datetime(series["ds"])
    daily = series.groupby("ds")["y"].sum().sort_index()
    full_index = pd.date_range(daily.index.min(), daily.index.max(), freq="D")
    return daily.reindex(full_index, fill_value=0.0)


def _is_intermittent(series: pd.Series) -> bool:
    if len(series) < 14:
        return False
    zero_share = float((series <= 0).mean())
    return zero_share >= 0.45


def _croston_forecast(series: pd.Series, horizon: int, alpha: float = 0.2) -> list[float]:
    demand = series.to_numpy(dtype=float)
    non_zero = demand[demand > 0]
    if len(non_zero) == 0:
        return [0.0] * horizon

    z = non_zero[0]
    p = max(1.0, len(demand) / len(non_zero))
    interval = 1
    for value in demand[1:]:
        if value > 0:
            z = alpha * value + (1 - alpha) * z
            p = alpha * interval + (1 - alpha) * p
            interval = 1
        else:
            interval += 1
    forecast = max(0.0, z / max(p, 1.0))
    return [forecast] * horizon


def _safety_stock(series: pd.Series, req: ForecastRequest) -> float:
    if len(series) < 2:
        return 0.0
    z = NormalDist().inv_cdf(req.service_level)
    daily_std = float(series.std(ddof=1))
    return max(0.0, z * daily_std * math.sqrt(req.lead_time_days))


def forecast_demand(req: ForecastRequest) -> ForecastResponse:
    artifact = _load_artifact()
    history = artifact["history"].copy()
    filtered_history, hierarchy_level = _filter_history(history, req)
    series = _daily_series(filtered_history)
    future = _future_frame(artifact, req, filtered_history)

    X_future = future[artifact["feature_columns"]]
    intermittent = _is_intermittent(series)
    if intermittent:
        p50 = np.array(_croston_forecast(series, req.horizon), dtype=float)
        variability = float(series[series > 0].std(ddof=1) if (series > 0).sum() > 1 else max(p50.mean(), 1.0))
        p10 = np.maximum(0, p50 - variability)
        p90 = np.maximum(p10, p50 + variability)
    else:
        p10 = np.maximum(0, artifact["models"]["p10"].predict(X_future))
        p50 = np.maximum(0, artifact["models"]["p50"].predict(X_future))
        p90 = np.maximum(p10, np.maximum(0, artifact["models"]["p90"].predict(X_future)))
        conformal_radius = float(artifact.get("conformal_radius_90", 0.0))
        p10 = np.maximum(0, np.minimum(p10, p50 - conformal_radius))
        p90 = np.maximum(p90, p50 + conformal_radius)

    points = [
        ForecastedPoint(
            ds=pd.Timestamp(day).date().isoformat(),
            yhat=float(mid),
            yhat_lower=float(low),
            yhat_upper=float(high),
        )
        for day, low, mid, high in zip(future["ds"], p10, p50, p90)
    ]

    safety_stock = _safety_stock(series, req)
    lead_time_mean = float(np.sum(p50[: min(req.lead_time_days, len(p50))]))
    reorder_point = lead_time_mean + safety_stock
    projected_inventory = req.current_inventory - float(np.sum(p50))
    should_reorder = req.current_inventory <= reorder_point
    peak_days = sorted(points, key=lambda item: item.yhat, reverse=True)[:5]

    return ForecastResponse(
        points=points,
        segment={
            "market": req.market,
            "order_region": req.order_region,
            "category": req.category,
            "sku": req.sku,
        },
        model_version=artifact["model_version"],
        model_type=artifact["model_type"],
        hierarchy_level=hierarchy_level,
        intermittent_method_used=intermittent,
        peak_days=peak_days,
        safety_stock=float(safety_stock),
        reorder_point=float(reorder_point),
        reorder_recommendation={
            "should_reorder": bool(should_reorder),
            "current_inventory": req.current_inventory,
            "projected_inventory_after_horizon": projected_inventory,
            "recommended_order_quantity": max(0.0, reorder_point - req.current_inventory),
            "service_level": req.service_level,
            "lead_time_days": req.lead_time_days,
        },
        validation_metrics=artifact.get("validation_metrics", {}),
        artifact_created_at=artifact.get("artifact_created_at"),
    )
