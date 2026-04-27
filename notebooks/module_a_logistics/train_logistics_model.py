"""
Training script for Module A - Predictive Logistics delay risk model.

Reads the latest cleaned dataset and trains a scikit-learn pipeline that predicts the
`Late_delivery_risk` flag. The trained model is saved under:

    backend/trained_models/logistics_model.pkl
    cd cognitive-logix
    python notebooks/module_a_logistics/train_logistics_model.py
"""

#xgboost lojistik gecikme hesaplama

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
MODEL_PATH = MODEL_DIR / "logistics_model.pkl"


def load_data() -> pd.DataFrame:
  df = pd.read_csv(DATA_PATH, encoding="utf-8-sig")

  # Filter to non-cancelled orders for delay model
  if "Order Status" in df.columns:
    df = df[~df["Order Status"].isin(["CANCELED", "SUSPECTED_FRAUD"])]

  # Safety check
  df = df.dropna(subset=["Late_delivery_risk"])
  return df


def build_pipeline(df: pd.DataFrame) -> Pipeline:
  target_col = "Late_delivery_risk"

  numeric_features = [
    "Days for shipping (real)",
    "Days for shipment (scheduled)",
    "shipping_delay",
    "Sales_winsor",
    "Order Item Product Price_winsor",
    "Benefit per order_winsor",
    "Order Item Quantity",
  ]

  categorical_features = [
    "Shipping Mode",
    "Order Region",
    "Market",
    "Category Name",
  ]

  # Ensure columns exist (in case of future schema tweaks)
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
    n_estimators=200,
    max_depth=10,
    min_samples_leaf=5,
    n_jobs=-1,
    random_state=42,
  )

  clf = Pipeline(steps=[("preprocessor", preprocessor), ("model", model)])

  clf.fit(X_train, y_train)

  y_pred = clf.predict(X_test)
  print("=== Delay risk model report (validation set) ===")
  print(classification_report(y_test, y_pred, digits=3))

  return clf


def main() -> None:
  print(f"Loading data from {DATA_PATH} ...")
  df = load_data()
  print(f"Data shape after filtering: {df.shape}")

  print("Training delay risk model ...")
  clf = build_pipeline(df)

  MODEL_DIR.mkdir(parents=True, exist_ok=True)
  with MODEL_PATH.open("wb") as f:
    pickle.dump(clf, f)
  print(f"\n✅ Model saved to: {MODEL_PATH}")


if __name__ == "__main__":
  main()

