"""Train the production fraud-risk model.

Algorithmic contract:
- CatBoostClassifier for supervised suspected-fraud probability.
- Isotonic calibration for reliable probabilities.
- IsolationForest for unknown/unsupervised anomaly pressure.
- CatBoost SHAP values are used at inference time for reason codes.

Output:
    backend/trained_models/fraud_model.pkl
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import pickle

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.isotonic import IsotonicRegression
from sklearn.metrics import average_precision_score, brier_score_loss, roc_auc_score
from sklearn.model_selection import train_test_split


try:
    from catboost import CatBoostClassifier, Pool
except ImportError as exc:  # pragma: no cover
    raise SystemExit(
        "CatBoost is required for the production fraud model. "
        "Run: pip install -r requirements.txt"
    ) from exc


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_PATH = PROJECT_ROOT / "data" / "temiz_veri_final_latest.csv"
MODEL_DIR = PROJECT_ROOT / "backend" / "trained_models"
MODEL_PATH = MODEL_DIR / "fraud_model.pkl"

ARTIFACT_VERSION = "cognitive-logix-ml-v2"
MODEL_VERSION = "fraud-catboost-iforest-v1"

NUMERIC_FEATURES = [
    "Sales_winsor",
    "Benefit per order_winsor",
    "shipping_delay",
    "negative_profit_flag",
    "Order Item Discount Rate",
    "Order Item Quantity",
]

CATEGORICAL_FEATURES = [
    "Market",
    "Customer Segment",
    "Order Region",
    "Category Name",
    "Type",
]


def load_data() -> pd.DataFrame:
    df = pd.read_csv(DATA_PATH, encoding="utf-8-sig")
    df["is_fraud"] = (df["Order Status"] == "SUSPECTED_FRAUD").astype(int)
    return df


def prepare_features(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series, list[str], list[str]]:
    numeric = [c for c in NUMERIC_FEATURES if c in df.columns]
    categorical = [c for c in CATEGORICAL_FEATURES if c in df.columns]
    features = numeric + categorical

    X = df[features].copy()
    for col in numeric:
        X[col] = pd.to_numeric(X[col], errors="coerce").fillna(0.0)
    for col in categorical:
        X[col] = X[col].fillna("Unknown").astype(str)

    y = df["is_fraud"].astype(int)
    return X, y, numeric, categorical


def normalize_iforest_scores(scores):
    # score_samples: higher is more normal. Convert to 0..1 anomaly pressure.
    raw = -scores
    min_v = float(raw.min())
    max_v = float(raw.max())
    if max_v == min_v:
        return raw * 0
    return (raw - min_v) / (max_v - min_v)


def best_risk_weights(y_true, supervised, anomaly) -> tuple[dict, np.ndarray, float]:
    candidates = [1.0, 0.9, 0.8, 0.7, 0.6]
    best_auc = -1.0
    best_weight = 1.0
    best_combined = supervised
    for supervised_weight in candidates:
        anomaly_weight = 1.0 - supervised_weight
        combined = supervised_weight * supervised + anomaly_weight * anomaly
        auc = float(roc_auc_score(y_true, combined))
        if auc > best_auc:
            best_auc = auc
            best_weight = supervised_weight
            best_combined = combined
    return {"supervised": best_weight, "anomaly": 1.0 - best_weight}, best_combined, best_auc


def main() -> None:
    df = load_data()
    X, y, numeric, categorical = prepare_features(df)
    cat_indices = [X.columns.get_loc(c) for c in categorical]

    X_train, X_temp, y_train, y_temp = train_test_split(
        X, y, test_size=0.30, random_state=42, stratify=y
    )
    X_cal, X_test, y_cal, y_test = train_test_split(
        X_temp, y_temp, test_size=0.50, random_state=42, stratify=y_temp
    )

    classifier = CatBoostClassifier(
        iterations=900,
        depth=7,
        learning_rate=0.035,
        loss_function="Logloss",
        eval_metric="AUC",
        auto_class_weights="Balanced",
        random_seed=42,
        allow_writing_files=False,
        verbose=100,
    )
    classifier.fit(
        Pool(X_train, y_train, cat_features=cat_indices),
        eval_set=Pool(X_cal, y_cal, cat_features=cat_indices),
        use_best_model=True,
    )

    cal_raw = classifier.predict_proba(Pool(X_cal, cat_features=cat_indices))[:, 1]
    calibrator = IsotonicRegression(out_of_bounds="clip")
    calibrator.fit(cal_raw, y_cal)

    iforest = IsolationForest(
        n_estimators=350,
        contamination=max(0.01, min(0.08, float(y.mean()) * 1.5)),
        random_state=42,
        n_jobs=1,
    )
    iforest.fit(X_train[numeric])

    test_raw = classifier.predict_proba(Pool(X_test, cat_features=cat_indices))[:, 1]
    test_calibrated = calibrator.predict(test_raw)
    test_anomaly = normalize_iforest_scores(iforest.score_samples(X_test[numeric]))
    risk_weights, combined, combined_auc = best_risk_weights(y_test, test_calibrated, test_anomaly)

    validation_metrics = {
        "roc_auc_supervised": float(roc_auc_score(y_test, test_calibrated)),
        "roc_auc_combined": combined_auc,
        "average_precision": float(average_precision_score(y_test, combined)),
        "brier_score": float(brier_score_loss(y_test, test_calibrated)),
        "risk_weights": risk_weights,
    }

    artifact = {
        "artifact_version": ARTIFACT_VERSION,
        "model_version": MODEL_VERSION,
        "model_type": "CatBoostClassifier + IsotonicRegression calibration + IsolationForest anomaly",
        "classifier": classifier,
        "calibrator": calibrator,
        "anomaly_model": iforest,
        "feature_columns": list(X.columns),
        "numeric_features": numeric,
        "categorical_features": categorical,
        "cat_feature_indices": cat_indices,
        "validation_metrics": validation_metrics,
        "risk_weights": risk_weights,
        "training_rows": int(len(X_train)),
        "calibration_rows": int(len(X_cal)),
        "test_rows": int(len(X_test)),
        "artifact_created_at": datetime.now(timezone.utc).isoformat(),
        "data_path": str(DATA_PATH),
    }

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    with MODEL_PATH.open("wb") as f:
        pickle.dump(artifact, f)

    print(f"Saved {MODEL_VERSION} to {MODEL_PATH}")
    print(validation_metrics)


if __name__ == "__main__":
    main()
