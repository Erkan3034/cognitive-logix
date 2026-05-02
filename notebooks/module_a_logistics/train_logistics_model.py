"""Train the production delay-risk model.

Algorithmic contract:
- CatBoostClassifier for categorical-heavy logistics data.
- Isotonic probability calibration on a holdout calibration split.
- CatBoost SHAP values are used at inference time for explanation.

Output:
    backend/trained_models/logistics_model.pkl
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import pickle

import pandas as pd
from sklearn.isotonic import IsotonicRegression
from sklearn.metrics import average_precision_score, brier_score_loss, roc_auc_score
from sklearn.model_selection import train_test_split


try:
    from catboost import CatBoostClassifier, Pool
except ImportError as exc:  # pragma: no cover - dependency setup guard
    raise SystemExit(
        "CatBoost is required for the production delay model. "
        "Run: pip install -r requirements.txt"
    ) from exc


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_PATH = PROJECT_ROOT / "data" / "temiz_veri_final_latest.csv"
MODEL_DIR = PROJECT_ROOT / "backend" / "trained_models"
MODEL_PATH = MODEL_DIR / "logistics_model.pkl"

ARTIFACT_VERSION = "cognitive-logix-ml-v2"
MODEL_VERSION = "delay-catboost-calibrated-v1"

NUMERIC_FEATURES = [
    "Days for shipment (scheduled)",
    "Sales_winsor",
    "Order Item Product Price_winsor",
    "Benefit per order_winsor",
    "Order Item Quantity",
    "Order Item Discount Rate",
]

CATEGORICAL_FEATURES = [
    "Shipping Mode",
    "Order Region",
    "Market",
    "Category Name",
]


def load_data() -> pd.DataFrame:
    df = pd.read_csv(DATA_PATH, encoding="utf-8-sig")
    df = df.dropna(subset=["Late_delivery_risk"])
    df = df[~df["Order Status"].isin(["CANCELED", "SUSPECTED_FRAUD"])]
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

    y = df["Late_delivery_risk"].astype(int)
    return X, y, numeric, categorical


def metrics_for(y_true, raw_proba, calibrated_proba) -> dict:
    return {
        "roc_auc_raw": float(roc_auc_score(y_true, raw_proba)),
        "roc_auc_calibrated": float(roc_auc_score(y_true, calibrated_proba)),
        "average_precision": float(average_precision_score(y_true, calibrated_proba)),
        "brier_score": float(brier_score_loss(y_true, calibrated_proba)),
    }


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

    model = CatBoostClassifier(
        iterations=700,
        depth=8,
        learning_rate=0.045,
        loss_function="Logloss",
        eval_metric="AUC",
        auto_class_weights="Balanced",
        random_seed=42,
        allow_writing_files=False,
        verbose=100,
    )
    model.fit(
        Pool(X_train, y_train, cat_features=cat_indices),
        eval_set=Pool(X_cal, y_cal, cat_features=cat_indices),
        use_best_model=True,
    )

    cal_raw = model.predict_proba(Pool(X_cal, cat_features=cat_indices))[:, 1]
    calibrator = IsotonicRegression(out_of_bounds="clip")
    calibrator.fit(cal_raw, y_cal)

    test_raw = model.predict_proba(Pool(X_test, cat_features=cat_indices))[:, 1]
    test_calibrated = calibrator.predict(test_raw)
    validation_metrics = metrics_for(y_test, test_raw, test_calibrated)

    artifact = {
        "artifact_version": ARTIFACT_VERSION,
        "model_version": MODEL_VERSION,
        "model_type": "CatBoostClassifier + IsotonicRegression calibration + CatBoost SHAP",
        "model": model,
        "calibrator": calibrator,
        "feature_columns": list(X.columns),
        "numeric_features": numeric,
        "categorical_features": categorical,
        "cat_feature_indices": cat_indices,
        "validation_metrics": validation_metrics,
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
