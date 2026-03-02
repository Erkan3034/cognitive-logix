from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path
from typing import List
import pickle

import numpy as np

from app.models.forecast import ForecastedPoint, TimeSeriesPoint


_DEMAND_MODEL = None
_LAST_DS: datetime | None = None
_N_HISTORY: int | None = None


def _load_model():
    global _DEMAND_MODEL, _LAST_DS, _N_HISTORY
    if _DEMAND_MODEL is None:
        model_path = (
            Path(__file__).resolve().parents[2] / "trained_models" / "demand_model.pkl"
        )
        if not model_path.exists():
            raise FileNotFoundError(
                f"Trained demand model not found at {model_path}. "
                "Run notebooks/module_b_demand/train_demand_model.py first."
            )
        with model_path.open("rb") as f:
            payload = pickle.load(f)
        _DEMAND_MODEL = payload["model"]
        _LAST_DS = payload["last_ds"]
        _N_HISTORY = payload["n_history"]
    return _DEMAND_MODEL, _LAST_DS, _N_HISTORY


def _build_future_features(start_ds: datetime, horizon: int, start_index: int):
    """Return feature matrix for future horizon days."""
    days = [start_ds + timedelta(days=i) for i in range(1, horizon + 1)]

    day_index = np.arange(start_index + 1, start_index + 1 + horizon, dtype=float)
    dow = np.array([d.weekday() for d in days], dtype=int)
    month = np.array([d.month for d in days], dtype=int)
    is_weekend = (dow >= 5).astype(int)

    # Order must match training in train_demand_model.py
    X = np.column_stack([day_index, dow, month, is_weekend])
    return days, X


def forecast_demand(series: List[TimeSeriesPoint], horizon: int) -> List[ForecastedPoint]:
    """
    Forecast daily demand using the trained RandomForestRegressor.

    The optional `series` payload is currently ignored (model is trained globally
    on all history). In a later iteration we can filter by category/market.
    """

    model, last_ds, n_history = _load_model()
    assert last_ds is not None and n_history is not None

    # If caller passed explicit last point, prefer that date
    if series:
        try:
            last_from_req = datetime.fromisoformat(series[-1].ds.replace("Z", "+00:00"))
            if last_from_req > last_ds:
                last_ds = last_from_req
        except Exception:
            pass

    future_days, X_future = _build_future_features(last_ds, horizon, n_history - 1)
    y_pred = model.predict(X_future)

    points: List[ForecastedPoint] = []
    for ds, yhat in zip(future_days, y_pred):
        points.append(
            ForecastedPoint(
                ds=ds.date().isoformat(),
                yhat=float(yhat),
                yhat_lower=None,
                yhat_upper=None,
            )
        )
    return points
