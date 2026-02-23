from fastapi import APIRouter

from app.models.fraud import FraudRequest, FraudResponse
from app.ml.fraud_model import score_anomaly

router = APIRouter(tags=["fraud"])


@router.post("/fraud", response_model=FraudResponse)
def fraud(req: FraudRequest):
    score = score_anomaly(req.features)
    return FraudResponse(anomaly_score=score)

