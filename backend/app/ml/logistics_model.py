from __future__ import annotations

from pathlib import Path
from typing import Any, Dict
import pickle

import pandas as pd


_MODEL = None


def _load_model():
    """Lazy-load the trained logistics model pipeline."""
    global _MODEL
    if _MODEL is None:
        model_path = Path(__file__).resolve().parents[2] / "trained_models" / "logistics_model.pkl"
        if not model_path.exists():
            raise FileNotFoundError(
                f"Trained logistics model not found at {model_path}. "
                "Run notebooks/module_a_logistics/train_logistics_model.py first."
            )
        with model_path.open("rb") as f:
            _MODEL = pickle.load(f)
    return _MODEL


def predict_delay_risk(features: Dict[str, Any]) -> float:
    """
    Predict delivery delay risk using the trained scikit-learn pipeline.

    `features` is expected to come from the frontend Logistics form, e.g.:

        {
            "shipping_mode": "Standard Class",
            "order_region": "Western Europe",
            "days_scheduled": 4,
            "category": "Sporting Goods",
            "market": "Europe",
            "sales": 150.0,
            "quantity": 2
        }
    """

    model = _load_model()

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
    }

    X = pd.DataFrame([row])
    proba = model.predict_proba(X)[0][1]
    return float(proba)

