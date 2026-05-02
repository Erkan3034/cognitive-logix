from __future__ import annotations

from pathlib import Path
from typing import Any, Dict
import pickle

import pandas as pd

from app.ml.model_contract import (
    ModelArtifactError,
    confidence_from_probability,
    require_v2_artifact,
    risk_level,
)


_MODEL = None


def _load_model():
    global _MODEL
    if _MODEL is None:
        model_path = Path(__file__).resolve().parents[2] / "trained_models" / "logistics_model.pkl"
        if not model_path.exists():
            raise FileNotFoundError(
                f"Trained logistics model not found at {model_path}. "
                "Run notebooks/module_a_logistics/train_logistics_model.py first."
            )
        with model_path.open("rb") as f:
            _MODEL = require_v2_artifact(pickle.load(f), "logistics")
    return _MODEL


def _row_from_features(features: Dict[str, Any], artifact: dict) -> pd.DataFrame:
    row: Dict[str, Any] = {
        "Shipping Mode": features.get("shipping_mode", "Standard Class"),
        "Order Region": features.get("order_region", "Western Europe"),
        "Market": features.get("market", "Europe"),
        "Category Name": features.get("category", "Sporting Goods"),
        "Days for shipping (real)": features.get("days_real", features.get("days_scheduled", 0)),
        "Days for shipment (scheduled)": features.get("days_scheduled", 0),
        "shipping_delay": features.get("shipping_delay", features.get("days_scheduled", 0)),
        "Sales_winsor": features.get("sales", 0.0),
        "Order Item Product Price_winsor": features.get(
            "unit_price", features.get("sales", 0.0)
        ),
        "Benefit per order_winsor": features.get("benefit_per_order", 0.0),
        "Order Item Quantity": features.get("quantity", 1),
        "Order Item Discount Rate": features.get("discount_rate", 0.0),
    }
    frame = pd.DataFrame([{col: row.get(col, "Unknown") for col in artifact["feature_columns"]}])
    for col in artifact["numeric_features"]:
        frame[col] = pd.to_numeric(frame[col], errors="coerce").fillna(0.0)
    for col in artifact["categorical_features"]:
        frame[col] = frame[col].fillna("Unknown").astype(str)
    return frame


def _top_shap_factors(artifact: dict, row: pd.DataFrame) -> list[dict[str, Any]]:
    try:
        from catboost import Pool

        model = artifact["model"]
        pool = Pool(row, cat_features=artifact["cat_feature_indices"])
        shap_values = model.get_feature_importance(pool, type="ShapValues")[0][:-1]
        pairs = sorted(
            zip(artifact["feature_columns"], shap_values),
            key=lambda item: abs(float(item[1])),
            reverse=True,
        )[:5]
        return [
            {
                "feature": name,
                "impact": float(value),
                "direction": "raises_risk" if value > 0 else "lowers_risk",
            }
            for name, value in pairs
        ]
    except Exception as exc:
        raise ModelArtifactError(f"Could not compute logistics SHAP explanation: {exc}") from exc


def _recommendations(score: float, features: Dict[str, Any]) -> list[dict[str, Any]]:
    actions: list[dict[str, Any]] = []
    if score >= 0.70:
        actions.append(
            {
                "action": "Upgrade shipping mode or assign priority carrier",
                "expected_effect": "Reduce calibrated delay risk before fulfillment",
                "priority": "critical",
            }
        )
    if float(features.get("days_scheduled", 0) or 0) <= 2 and score >= 0.45:
        actions.append(
            {
                "action": "Notify customer success and set proactive SLA watch",
                "expected_effect": "Lower escalation cost for time-sensitive delivery",
                "priority": "high",
            }
        )
    actions.append(
        {
            "action": "Monitor lane-level risk until dispatch confirmation",
            "expected_effect": "Keep this shipment in the operational control loop",
            "priority": "medium" if score >= 0.40 else "low",
        }
    )
    return actions


def _counterfactuals(features: Dict[str, Any], artifact: dict, base_score: float) -> list[dict[str, Any]]:
    model = artifact["model"]
    calibrator = artifact["calibrator"]
    candidates = []
    for mode in ["Second Class", "First Class", "Same Day"]:
        if mode == features.get("shipping_mode"):
            continue
        changed = {**features, "shipping_mode": mode}
        row = _row_from_features(changed, artifact)
        raw = float(model.predict_proba(row)[0][1])
        calibrated = float(calibrator.predict([raw])[0])
        if calibrated < base_score:
            candidates.append(
                {
                    "change": f"shipping_mode -> {mode}",
                    "new_risk": calibrated,
                    "risk_reduction": base_score - calibrated,
                }
            )
    return sorted(candidates, key=lambda item: item["risk_reduction"], reverse=True)[:3]


def predict_delay_risk(features: Dict[str, Any]) -> Dict[str, Any]:
    artifact = _load_model()
    row = _row_from_features(features, artifact)
    model = artifact["model"]
    calibrator = artifact["calibrator"]

    raw = float(model.predict_proba(row)[0][1])
    calibrated = float(calibrator.predict([raw])[0])

    return {
        "delay_risk": raw,
        "calibrated_delay_risk": calibrated,
        "risk_level": risk_level(calibrated),
        "model_version": artifact["model_version"],
        "model_type": artifact["model_type"],
        "confidence": confidence_from_probability(calibrated),
        "top_factors": _top_shap_factors(artifact, row),
        "recommendations": _recommendations(calibrated, features),
        "counterfactuals": _counterfactuals(features, artifact, calibrated),
        "validation_metrics": artifact.get("validation_metrics", {}),
        "artifact_created_at": artifact.get("artifact_created_at"),
    }

