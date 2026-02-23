from fastapi import APIRouter

from app.models.forecast import ForecastRequest, ForecastResponse
from app.ml.demand_model import forecast_demand

router = APIRouter(tags=["demand"])


@router.post("/forecast", response_model=ForecastResponse)
def forecast(req: ForecastRequest):
    points = forecast_demand(req.series, req.horizon)
    return ForecastResponse(points=points)

