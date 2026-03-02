"""
Training script for Module B - Demand Intelligence.

Trains a simple daily demand forecast model on the latest cleaned analysis data
(`data/processed/analiz_veri.csv`) and saves the model as:

    backend/trained_models/demand_model.pkl

The model is intentionally lightweight (RandomForestRegressor on calendar features)
so it runs reliably in a constrained environment without Prophet.
"""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
import pickle

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import train_test_split


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_PATH = PROJECT_ROOT / "data" / "processed" / "analiz_veri.csv"
MODEL_DIR = PROJECT_ROOT / "backend" / "trained_models"
MODEL_PATH = MODEL_DIR / "demand_model.pkl"


def load_daily_series() -> pd.DataFrame:
    df = pd.read_csv(DATA_PATH, encoding="utf-8-sig")

    # Use order date as time axis
    df["order_date"] = pd.to_datetime(df["order date (DateOrders)"])

    # Aggregate to daily total sales
    daily = (
        df.groupby(df["order_date"].dt.date)["Sales"]
        .sum()
        .rename("y")
        .to_frame()
        .reset_index()
        .rename(columns={"order_date": "ds"})
    )

    daily["ds"] = pd.to_datetime(daily["ds"])
    daily = daily.sort_values("ds").reset_index(drop=True)
    return daily


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    X = pd.DataFrame(index=df.index)
    X["day_index"] = np.arange(len(df), dtype=float)
    X["dow"] = df["ds"].dt.weekday.astype(int)
    X["month"] = df["ds"].dt.month.astype(int)
    X["is_weekend"] = (X["dow"] >= 5).astype(int)
    return X


def train_model(series: pd.DataFrame) -> RandomForestRegressor:
    X = build_features(series)
    y = series["y"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, shuffle=False
    )

    model = RandomForestRegressor(
        n_estimators=200,
        max_depth=12,
        min_samples_leaf=3,
        random_state=42,
        n_jobs=-1,
    )

    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    print(f"Validation MAE: {mae:,.2f} units per day")

    return model


def main() -> None:
    print(f"Loading analysis data from {DATA_PATH} ...")
    series = load_daily_series()
    print(f"Daily series shape: {series.shape} (from {series['ds'].min()} to {series['ds'].max()})")

    print("Training demand model ...")
    model = train_model(series)

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    with MODEL_PATH.open("wb") as f:
        pickle.dump(
            {
                "model": model,
                "last_ds": series["ds"].iloc[-1],
                "n_history": len(series),
            },
            f,
        )
    print(f"✅ Demand model saved to: {MODEL_PATH}")


if __name__ == "__main__":
    main()

