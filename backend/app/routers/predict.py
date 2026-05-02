from fastapi import APIRouter

from app.models.predict import PredictRequest, PredictResponse
from app.ml.logistics_model import predict_delay_risk

router = APIRouter(tags=["logistics"])


@router.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    return PredictResponse(**predict_delay_risk(req.features))

