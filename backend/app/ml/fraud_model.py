from __future__ import annotations

from pathlib import Path
from typing import Any, Dict
import pickle

import numpy as np
import pandas as pd

from app.ml.model_contract import (
    ModelArtifactError,
    confidence_from_probability,
    require_v2_artifact,
    risk_level,
)


_FRAUD_MODEL = None


def _load_model():
    global _FRAUD_MODEL
    if _FRAUD_MODEL is None:
        model_path = (
            Path(__file__).resolve().parents[2] / "trained_models" / "fraud_model.pkl"
        )
        if not model_path.exists():
            raise FileNotFoundError(
                f"Trained fraud model not found at {model_path}. "
                "Run notebooks/module_c_fraud/train_fraud_model.py first."
            )
        with model_path.open("rb") as f:
            _FRAUD_MODEL = require_v2_artifact(pickle.load(f), "fraud")
    return _FRAUD_MODEL


def _row_from_features(features: Dict[str, Any], artifact: dict) -> pd.DataFrame:
    row: Dict[str, Any] = {
        "Sales_winsor": features.get("sales", 0.0),
        "Benefit per order_winsor": features.get("benefit_per_order", 0.0),
        "shipping_delay": features.get("shipping_delay", 0.0),
        "negative_profit_flag": features.get(
            "negative_profit_flag",
            1 if float(features.get("benefit_per_order", 0.0) or 0.0) < 0 else 0,
        ),
        "Order Item Discount Rate": features.get("discount_rate", 0.0),
        "Order Item Quantity": features.get("quantity", 1),
        "Market": features.get("market", ""),
        "Customer Segment": features.get("customer_segment", ""),
        "Order Region": features.get("order_region", "Unknown"),
        "Category Name": features.get("category", "Unknown"),
        "Type": features.get("payment_type", "Unknown"),
    }
    frame = pd.DataFrame([{col: row.get(col, "Unknown") for col in artifact["feature_columns"]}])
    for col in artifact["numeric_features"]:
        frame[col] = pd.to_numeric(frame[col], errors="coerce").fillna(0.0)
    for col in artifact["categorical_features"]:
        frame[col] = frame[col].fillna("Unknown").astype(str)
    return frame


def _normalized_anomaly_score(artifact: dict, row: pd.DataFrame) -> float:
    scores = -artifact["anomaly_model"].score_samples(row[artifact["numeric_features"]])
    # Logistic squashing avoids storing training min/max while preserving ordering.
    return float(1.0 / (1.0 + np.exp(-scores[0])))


def _reason_codes(artifact: dict, row: pd.DataFrame, features: Dict[str, Any]) -> list[dict[str, Any]]:
    reasons: list[dict[str, Any]] = []
    if float(features.get("benefit_per_order", 0.0) or 0.0) < 0:
        reasons.append({"reason": "Negative profit order", "impact": "raises_risk", "priority": "high"})
    if float(features.get("sales", 0.0) or 0.0) > 500:
        reasons.append({"reason": "High transaction amount", "impact": "raises_risk", "priority": "medium"})
    try:
        from catboost import Pool

        pool = Pool(row, cat_features=artifact["cat_feature_indices"])
        shap_values = artifact["classifier"].get_feature_importance(pool, type="ShapValues")[0][:-1]
        pairs = sorted(
            zip(artifact["feature_columns"], shap_values),
            key=lambda item: abs(float(item[1])),
            reverse=True,
        )[:4]
        reasons.extend(
            {
                "reason": name,
                "impact": "raises_risk" if value > 0 else "lowers_risk",
                "shap_value": float(value),
                "priority": "high" if abs(float(value)) > 0.3 else "medium",
            }
            for name, value in pairs
        )
    except Exception as exc:
        raise ModelArtifactError(f"Could not compute fraud SHAP explanation: {exc}") from exc
    return reasons[:6]


def _recommended_actions(score: float) -> list[dict[str, Any]]:
    if score >= 0.75:
        return [
            {"action": "Hold fulfillment and require manual fraud review", "priority": "critical"},
            {"action": "Request additional payment verification", "priority": "high"},
        ]
    if score >= 0.45:
        return [
            {"action": "Route to analyst queue before shipment", "priority": "high"},
            {"action": "Check customer and payment history", "priority": "medium"},
        ]
    return [{"action": "Approve with passive monitoring", "priority": "low"}]


def _loss_pressure(features: Dict[str, Any]) -> float:
    sales = max(float(features.get("sales", 0.0) or 0.0), 1.0)
    benefit = float(features.get("benefit_per_order", 0.0) or 0.0)
    discount = float(features.get("discount_rate", 0.0) or 0.0)
    if benefit >= 0:
        return min(0.25, max(0.0, discount - 0.25))
    loss_ratio = abs(benefit) / sales
    return min(1.0, 0.35 + loss_ratio + max(0.0, discount - 0.20))


def score_anomaly(features: Dict[str, Any]) -> Dict[str, Any]:
    artifact = _load_model()
    row = _row_from_features(features, artifact)

    raw_fraud = float(artifact["classifier"].predict_proba(row)[0][1])
    fraud_probability = float(artifact["calibrator"].predict([raw_fraud])[0])
    anomaly_score = _normalized_anomaly_score(artifact, row)
    weights = artifact.get("risk_weights", {"supervised": 1.0, "anomaly": 0.0})
    combined = (float(weights.get("supervised", 1.0)) * fraud_probability) + (
        float(weights.get("anomaly", 0.0)) * anomaly_score
    )
    loss_pressure = _loss_pressure(features)
    combined = max(combined, loss_pressure)

    return {
        "anomaly_score": anomaly_score,
        "fraud_probability": fraud_probability,
        "combined_risk_score": combined,
        "risk_level": risk_level(combined, high=0.75, medium=0.45),
        "model_version": artifact["model_version"],
        "model_type": artifact["model_type"],
        "confidence": confidence_from_probability(combined),
        "reason_codes": _reason_codes(artifact, row, features),
        "recommended_actions": _recommended_actions(combined),
        "validation_metrics": artifact.get("validation_metrics", {}),
        "loss_pressure": loss_pressure,
        "artifact_created_at": artifact.get("artifact_created_at"),
    }

