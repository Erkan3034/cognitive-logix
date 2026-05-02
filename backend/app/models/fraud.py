from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class FraudRequest(BaseModel):
    features: Dict[str, Any] = Field(default_factory=dict)


class FraudResponse(BaseModel):
    anomaly_score: float
    fraud_probability: float
    combined_risk_score: float
    loss_pressure: float = 0.0
    risk_level: str
    model_version: str
    model_type: str
    confidence: float
    reason_codes: List[Dict[str, Any]] = Field(default_factory=list)
    recommended_actions: List[Dict[str, Any]] = Field(default_factory=list)
    validation_metrics: Dict[str, Any] = Field(default_factory=dict)
    artifact_created_at: Optional[str] = None

