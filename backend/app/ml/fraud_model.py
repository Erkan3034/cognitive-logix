from __future__ import annotations

from typing import Any, Dict


def score_anomaly(features: Dict[str, Any]) -> float:
    """
    Placeholder anomaly score.
    Replace with an Isolation Forest (or similar) model loaded from `backend/trained_models/`.
    """
    _ = features
    return 0.13

