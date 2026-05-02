from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    features: Dict[str, Any] = Field(default_factory=dict)


class PredictResponse(BaseModel):
    delay_risk: float
    calibrated_delay_risk: float
    risk_level: str
    model_version: str
    model_type: str
    confidence: float
    top_factors: List[Dict[str, Any]] = Field(default_factory=list)
    recommendations: List[Dict[str, Any]] = Field(default_factory=list)
    counterfactuals: List[Dict[str, Any]] = Field(default_factory=list)
    validation_metrics: Dict[str, Any] = Field(default_factory=dict)
    artifact_created_at: Optional[str] = None

