from __future__ import annotations

from typing import Any


ARTIFACT_VERSION = "cognitive-logix-ml-v2"


class ModelArtifactError(RuntimeError):
    pass


def require_v2_artifact(payload: Any, model_name: str) -> dict:
    if not isinstance(payload, dict) or payload.get("artifact_version") != ARTIFACT_VERSION:
        raise ModelArtifactError(
            f"{model_name} model artifact is not production-ready. "
            "Retrain it with the matching notebook training script so it contains "
            f"artifact_version={ARTIFACT_VERSION}."
        )
    return payload


def risk_level(score: float, high: float = 0.70, medium: float = 0.40) -> str:
    if score >= high:
        return "high"
    if score >= medium:
        return "medium"
    return "low"


def confidence_from_probability(probability: float) -> float:
    # Distance from the decision boundary, scaled into a conservative 0.5..1.0 band.
    return round(0.5 + min(abs(probability - 0.5), 0.5), 4)
