from typing import Any, Dict

from pydantic import BaseModel, Field


class FraudRequest(BaseModel):
    features: Dict[str, Any] = Field(default_factory=dict)


class FraudResponse(BaseModel):
    anomaly_score: float

