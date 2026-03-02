from __future__ import annotations

from pathlib import Path
from typing import Any, Dict
import pickle

import pandas as pd


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
            _FRAUD_MODEL = pickle.load(f)
    return _FRAUD_MODEL


def score_anomaly(features: Dict[str, Any]) -> float:
    """
    Return anomaly / fraud probability based on the trained classifier.

    `features` is expected to contain at least:
        sales, benefit_per_order, shipping_delay, negative_profit_flag,
        market, customer_segment
    """

    model = _load_model()

    row: Dict[str, Any] = {
        "Sales_winsor": features.get("sales", 0.0),
        "Benefit per order_winsor": features.get("benefit_per_order", 0.0),
        "shipping_delay": features.get("shipping_delay", 0.0),
        "negative_profit_flag": features.get("negative_profit_flag", 0),
        "Market": features.get("market", ""),
        "Customer Segment": features.get("customer_segment", ""),
    }

    X = pd.DataFrame([row])
    proba = model.predict_proba(X)[0][1]  # probability of is_fraud = 1
    return float(proba)

