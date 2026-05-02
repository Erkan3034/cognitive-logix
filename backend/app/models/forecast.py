from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class TimeSeriesPoint(BaseModel):
    ds: str = Field(..., description="date/time string")
    y: float = Field(..., description="value")


class ForecastRequest(BaseModel):
    horizon: int = Field(14, ge=1, le=365)
    series: List[TimeSeriesPoint] = Field(default_factory=list)
    category: Optional[str] = None
    market: Optional[str] = None
    order_region: Optional[str] = None
    sku: Optional[str] = None
    service_level: float = Field(0.95, ge=0.5, le=0.999)
    lead_time_days: int = Field(7, ge=1, le=180)
    current_inventory: float = Field(0.0, ge=0.0)


class ForecastedPoint(BaseModel):
    ds: str
    yhat: float
    yhat_lower: Optional[float] = None
    yhat_upper: Optional[float] = None


class ForecastResponse(BaseModel):
    points: List[ForecastedPoint]
    segment: Dict[str, Optional[str]] = Field(default_factory=dict)
    model_version: str
    model_type: str
    hierarchy_level: str
    intermittent_method_used: bool = False
    peak_days: List[ForecastedPoint] = Field(default_factory=list)
    safety_stock: float
    reorder_point: float
    reorder_recommendation: Dict[str, Any] = Field(default_factory=dict)
    validation_metrics: Dict[str, Any] = Field(default_factory=dict)
    artifact_created_at: Optional[str] = None

