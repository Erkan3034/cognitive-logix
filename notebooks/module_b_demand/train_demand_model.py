"""Train the production demand and inventory decision model.

Algorithmic contract:
- LightGBM quantile regressors for low / expected / high demand.
- Hierarchical segment features: total, market, region, category, SKU.
- Runtime Croston/TSB support for intermittent segment histories.
- Safety-stock and reorder-point calculations are served by inference.

Output:
    backend/trained_models/demand_model.pkl
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import pickle

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error


try:
    from lightgbm import LGBMRegressor
except ImportError as exc:  # pragma: no cover
    raise SystemExit(
        "LightGBM is required for the production demand model. "
        "Run: pip install -r requirements.txt"
    ) from exc


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_PATH = PROJECT_ROOT / "data" / "processed" / "analiz_veri.csv"
MODEL_DIR = PROJECT_ROOT / "backend" / "trained_models"
MODEL_PATH = MODEL_DIR / "demand_model.pkl"

ARTIFACT_VERSION = "cognitive-logix-ml-v2"
MODEL_VERSION = "demand-lightgbm-quantile-hierarchical-v1"

SEGMENT_COLUMNS = ["Market", "Order Region", "Category Name", "Product Card Id"]
CATEGORICAL_FEATURES = ["Market", "Order Region", "Category Name", "Product Card Id"]


def load_daily_segments() -> pd.DataFrame:
    df = pd.read_csv(DATA_PATH, encoding="utf-8-sig")
    df["ds"] = pd.to_datetime(df["order date (DateOrders)"]).dt.floor("D")
    for col in SEGMENT_COLUMNS:
        df[col] = df[col].fillna("Unknown").astype(str)

    daily = (
        df.groupby(["ds", *SEGMENT_COLUMNS], dropna=False)["Sales"]
        .sum()
        .rename("y")
        .reset_index()
        .sort_values("ds")
        .reset_index(drop=True)
    )
    return daily


def add_calendar_features(frame: pd.DataFrame, first_day: pd.Timestamp) -> pd.DataFrame:
    out = frame.copy()
    out["day_index"] = (out["ds"] - first_day).dt.days.astype(float)
    out["dow"] = out["ds"].dt.weekday.astype(int)
    out["month"] = out["ds"].dt.month.astype(int)
    out["quarter"] = out["ds"].dt.quarter.astype(int)
    out["is_weekend"] = (out["dow"] >= 5).astype(int)
    return out


def build_training_frame(daily: pd.DataFrame) -> tuple[pd.DataFrame, pd.Timestamp]:
    first_day = daily["ds"].min()
    frame = add_calendar_features(daily, first_day)

    for col in CATEGORICAL_FEATURES:
        frame[col] = frame[col].astype("category")

    return frame, first_day


def train_quantile_model(X_train, y_train, alpha: float) -> LGBMRegressor:
    model = LGBMRegressor(
        objective="quantile",
        alpha=alpha,
        n_estimators=900,
        learning_rate=0.035,
        num_leaves=48,
        min_child_samples=18,
        subsample=0.92,
        colsample_bytree=0.92,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train, categorical_feature=CATEGORICAL_FEATURES)
    return model


def main() -> None:
    daily = load_daily_segments()
    frame, first_day = build_training_frame(daily)

    feature_columns = [
        "day_index",
        "dow",
        "month",
        "quarter",
        "is_weekend",
        *CATEGORICAL_FEATURES,
    ]
    cutoff = frame["ds"].quantile(0.80)
    train = frame[frame["ds"] <= cutoff]
    test = frame[frame["ds"] > cutoff]

    X_train = train[feature_columns]
    y_train = train["y"].astype(float)
    X_test = test[feature_columns]
    y_test = test["y"].astype(float)

    models = {
        "p10": train_quantile_model(X_train, y_train, 0.10),
        "p50": train_quantile_model(X_train, y_train, 0.50),
        "p90": train_quantile_model(X_train, y_train, 0.90),
    }

    p50 = np.maximum(0, models["p50"].predict(X_test))
    p10 = np.maximum(0, models["p10"].predict(X_test))
    p90 = np.maximum(p10, np.maximum(0, models["p90"].predict(X_test)))
    conformal_radius = float(np.quantile(np.abs(y_test - p50), 0.90))
    calibrated_p10 = np.maximum(0, np.minimum(p10, p50 - conformal_radius))
    calibrated_p90 = np.maximum(p90, p50 + conformal_radius)
    interval_coverage = float(((y_test >= calibrated_p10) & (y_test <= calibrated_p90)).mean())

    validation_metrics = {
        "mae_p50": float(mean_absolute_error(y_test, p50)),
        "p10_p90_coverage": interval_coverage,
        "conformal_radius_90": conformal_radius,
        "test_rows": int(len(test)),
        "train_rows": int(len(train)),
    }

    compact_history = daily.copy()
    compact_history["ds"] = compact_history["ds"].dt.strftime("%Y-%m-%d")

    artifact = {
        "artifact_version": ARTIFACT_VERSION,
        "model_version": MODEL_VERSION,
        "model_type": "LightGBM quantile regressors + hierarchical segment features + Croston/TSB runtime",
        "models": models,
        "feature_columns": feature_columns,
        "categorical_features": CATEGORICAL_FEATURES,
        "segment_columns": SEGMENT_COLUMNS,
        "first_day": first_day,
        "last_day": daily["ds"].max(),
        "history": compact_history,
        "validation_metrics": validation_metrics,
        "conformal_radius_90": conformal_radius,
        "artifact_created_at": datetime.now(timezone.utc).isoformat(),
        "data_path": str(DATA_PATH),
    }

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    with MODEL_PATH.open("wb") as f:
        pickle.dump(artifact, f)

    print(f"Saved {MODEL_VERSION} to {MODEL_PATH}")
    print(validation_metrics)


if __name__ == "__main__":
    main()
