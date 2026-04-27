"""
Training script for Module C - Fraud & Negative Profit Risk.

Uses the latest full dataset (`data/temiz_veri_final_latest.csv`) to train a
binary classifier that predicts whether an order is SUSPECTED_FRAUD or not.

The trained model is saved as:

    backend/trained_models/fraud_model.pkl
"""

# Isolation Forest ve XGBoost ile sahtekarlık tespiti

from __future__ import annotations

from pathlib import Path
import pickle

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_PATH = PROJECT_ROOT / "data" / "temiz_veri_final_latest.csv"
MODEL_DIR = PROJECT_ROOT / "backend" / "trained_models"
MODEL_PATH = MODEL_DIR / "fraud_model.pkl"


def load_data() -> pd.DataFrame:
    df = pd.read_csv(DATA_PATH, encoding="utf-8-sig")

    # Label: suspected fraud vs everything else
    df["is_fraud"] = (df["Order Status"] == "SUSPECTED_FRAUD").astype(int)

    # Keep only relevant columns
    return df


def build_pipeline(df: pd.DataFrame) -> Pipeline:
    target_col = "is_fraud"

    numeric_features = [
        "Sales_winsor",
        "Benefit per order_winsor",
        "shipping_delay",
        "negative_profit_flag",
    ]

    categorical_features = [
        "Market",
        "Customer Segment",
    ]

    numeric_features = [c for c in numeric_features if c in df.columns]
    categorical_features = [c for c in categorical_features if c in df.columns]

    X = df[numeric_features + categorical_features]
    y = df[target_col].astype(int)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    numeric_transformer = Pipeline(
        steps=[
            ("scaler", StandardScaler()),
        ]
    )

    categorical_transformer = OneHotEncoder(handle_unknown="ignore")

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_transformer, numeric_features),
            ("cat", categorical_transformer, categorical_features),
        ]
    )

    model = RandomForestClassifier(
        n_estimators=300,
        max_depth=10,
        min_samples_leaf=5,
        n_jobs=-1,
        random_state=42,
    )

    clf = Pipeline(steps=[("preprocessor", preprocessor), ("model", model)])

    clf.fit(X_train, y_train)

    y_pred = clf.predict(X_test)
    print("=== Fraud model report (validation set) ===")
    print(classification_report(y_test, y_pred, digits=3))

    return clf


def main() -> None:
    print(f"Loading fraud data from {DATA_PATH} ...")
    df = load_data()
    print(f"Data shape: {df.shape}")

    print("Training fraud model ...")
    clf = build_pipeline(df)

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    with MODEL_PATH.open("wb") as f:
        pickle.dump(clf, f)
    print(f"✅ Fraud model saved to: {MODEL_PATH}")


if __name__ == "__main__":
    main()

