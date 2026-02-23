from __future__ import annotations

from datetime import datetime, timedelta
from typing import List

from app.models.forecast import ForecastedPoint, TimeSeriesPoint


def forecast_demand(series: List[TimeSeriesPoint], horizon: int) -> List[ForecastedPoint]:
    """
    Placeholder forecast.
    Replace with Prophet (or another model) inference and return forecast points.
    """
    last_ds = datetime.utcnow()
    if series:
        try:
            last_ds = datetime.fromisoformat(series[-1].ds.replace("Z", "+00:00"))
        except Exception:
            pass

    points: List[ForecastedPoint] = []
    for i in range(1, horizon + 1):
        ds = (last_ds + timedelta(days=i)).date().isoformat()
        points.append(ForecastedPoint(ds=ds, yhat=100.0))
    return points

