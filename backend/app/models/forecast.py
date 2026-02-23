from typing import List, Optional

from pydantic import BaseModel, Field


class TimeSeriesPoint(BaseModel):
    ds: str = Field(..., description="date/time string")
    y: float = Field(..., description="value")


class ForecastRequest(BaseModel):
    horizon: int = Field(14, ge=1, le=365)
    series: List[TimeSeriesPoint] = Field(default_factory=list)


class ForecastedPoint(BaseModel):
    ds: str
    yhat: float
    yhat_lower: Optional[float] = None
    yhat_upper: Optional[float] = None


class ForecastResponse(BaseModel):
    points: List[ForecastedPoint]

