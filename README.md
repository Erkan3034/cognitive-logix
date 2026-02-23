# 🧠 cognitive-logix

> **AI-powered Supply Chain Digital Twin** — Predicts delivery delays, detects fraud & forecasts demand using multi-layer machine learning.

[![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python)](https://python.org)
[![React](https://img.shields.io/badge/Frontend-React-61DAFB?logo=react)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/API-FastAPI-green?logo=fastapi)](https://fastapi.tiangolo.com)
[![Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E?logo=supabase)](https://supabase.com)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## 📌 Project Overview

**cognitive-logix** is a Cognitive Control Tower for end-to-end supply chain management. Built on 180,000+ real transactions from the [DataCo Smart Supply Chain Dataset](https://www.kaggle.com/datasets/shashwatwork/dataco-smart-supply-chain-for-big-data-analysis), the system goes beyond reporting — it predicts, detects, and prescribes.

| Module | Problem | Approach |
|--------|---------|----------|
| 🚚 **Predictive Logistics** | Will this order be late? | XGBoost / CatBoost + SHAP |
| 📦 **Demand Intelligence** | What will demand look like next month? | Prophet + LSTM |
| 🛡️ **Financial Security** | Is this order fraudulent or unprofitable? | Isolation Forest + SMOTE |

---

## 🏗️ Architecture

```
[Frontend]     React + Vite + Tailwind CSS + shadcn/ui + Recharts
                          ↓ REST API (JSON)
[Backend]      FastAPI (Python 3.10+)
                          ↓
[ML Layer]     XGBoost | Prophet + LSTM | Isolation Forest
                          ↓
[Database]     Supabase → PostgreSQL + Auth + Storage
                          ↓
[Deploy]       Vercel (Frontend) + Railway (Backend)
```

---

## 📁 Repository Structure

```
cognitive-logix/
│
├── frontend/                        # React application
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                  # shadcn/ui base components
│   │   │   ├── charts/              # Recharts wrappers
│   │   │   ├── ModuleA/             # Logistics dashboard components
│   │   │   ├── ModuleB/             # Demand forecast components
│   │   │   └── ModuleC/             # Fraud & risk components
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx        # Main overview
│   │   │   ├── Logistics.jsx        # Delay prediction UI
│   │   │   ├── Demand.jsx           # Forecast & simulation UI
│   │   │   ├── Fraud.jsx            # Fraud detection UI
│   │   │   └── Login.jsx            # Supabase auth
│   │   ├── lib/
│   │   │   ├── supabaseClient.js    # Supabase connection
│   │   │   └── api.js               # FastAPI calls (axios)
│   │   └── App.jsx
│   ├── .env.local                   # VITE_SUPABASE_URL, VITE_API_URL
│   ├── package.json
│   └── vite.config.js
│
├── backend/                         # FastAPI application
│   ├── app/
│   │   ├── main.py                  # FastAPI entry point
│   │   ├── routers/
│   │   │   ├── predict.py           # POST /predict (delay risk)
│   │   │   ├── forecast.py          # POST /forecast (demand)
│   │   │   └── fraud.py             # POST /fraud (anomaly score)
│   │   ├── models/                  # Pydantic request/response schemas
│   │   └── ml/
│   │       ├── logistics_model.py   # XGBoost inference
│   │       ├── demand_model.py      # Prophet inference
│   │       └── fraud_model.py       # Isolation Forest inference
│   ├── trained_models/              # .pkl model files (gitignored)
│   ├── requirements.txt
│   └── Dockerfile
│
├── notebooks/                       # Jupyter — model training
│   ├── module_a_logistics/          # Erkan
│   ├── module_b_demand/             # Aslı
│   └── module_c_fraud/              # Ismail
│
├── data/
│   ├── raw/                         # ⚠️ Gitignored (96MB CSV)
│   └── processed/                   # temiz_veri_final.csv, analiz_veri.csv
│
├── reports/                         # Weekly reports & visuals
├── .gitignore
└── README.md
```

---

## 🚀 Setup

### Prerequisites
- Node.js 18+
- Python 3.10+
- Supabase account (free tier)

### 1. Clone
```bash
git clone https://github.com/YOUR_USERNAME/cognitive-logix.git
cd cognitive-logix
```

### 2. Frontend
```bash
cd frontend
npm install
# Create .env.local (see env.example)
npm run dev
```

### 3. Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
# Create .env (see env.example)
uvicorn app.main:app --reload
```

### 4. Data
```bash
# Download CSV from Kaggle → place in data/raw/
# Then run:
python notebooks/module_c_fraud/data_cleaning.py
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description | Owner |
|--------|----------|-------------|-------|
| `POST` | `/predict` | Delivery delay risk score + SHAP explanation | Erkan |
| `POST` | `/forecast` | Demand forecast by category & date range | Aslı |
| `POST` | `/fraud` | Fraud & negative profit risk score | Ismail |
| `GET` | `/health` | API health check | — |

### Example: `/predict`
```json
// Request
{
  "shipping_mode": "Standard Class",
  "order_region": "Western Europe",
  "days_scheduled": 4,
  "category": "Sporting Goods",
  "market": "Europe"
}

// Response
{
  "delay_risk": 0.87,
  "label": "High Risk",
  "shap_explanation": {
    "shipping_mode": 0.34,
    "order_region": 0.28,
    "days_scheduled": 0.15
  }
}
```

---

## 🔑 Key Findings (Week 1–2 EDA)

- **54.8% late delivery rate** — nearly 1 in 2 orders arrive late
- **18.7% negative profit** — 33,784 orders result in a loss
- **Fraud rate: 2.25%** — 43:1 class imbalance, requires SMOTE
- **Zero duplicates** — data integrity confirmed across 180K+ records
- `Product Description`: 100% empty — removed
- `Order Zipcode`: 86% missing — excluded from geographic analysis

---

## 🧹 Data Cleaning Summary

| Step | Action | Result |
|------|--------|--------|
| Encoding | Latin-1 instead of UTF-8 | File loaded successfully |
| BOM character | `ï»¿Type` → `Type` | Column name fixed |
| Date columns | Converted to datetime | Temporal analysis enabled |
| Sensitive columns | Removed email, password, street, image | Privacy compliant |
| Empty columns | Removed `Product Description`, `Product Status` | Cleaner feature space |
| Trailing spaces | Stripped all string columns | Categorical consistency |
| Derived feature | `shipping_delay` (days) | No negative values found |
| Flagging | `negative_profit_flag`, `is_canceled` | Records preserved, not deleted |
| Output | `temiz_veri_final.csv`, `analiz_veri.csv` | Ready for modeling |

---

## 👥 Team

| Name |  Module | Role |
|------|-------------------|------|
| **Erkan TURGUT**  | Module A | Predictive Logistics Engineer |
| **Aslı AYDIN** | Module B | Demand & Inventory Analyst |
| **Ismail NAIT OUCHEN** | Module C | Financial Security & Full-Stack |

---

## 🗓️ Roadmap

- [x] Week 1: Research, dataset analysis, team setup, GitHub & Colab init
- [x] Week 2: Data cleaning, EDA, missing value analysis, cleaned CSVs
- [ ] Week 3–4: Feature engineering (Haversine, time features, encodings)
- [ ] Week 5: Outlier analysis & normalization
- [ ] Week 6–7: Model development (XGBoost, Prophet, Isolation Forest)
- [ ] Week 8: Model optimization (CatBoost, LSTM, SMOTE)
- [ ] Week 9–10: XAI — SHAP integration
- [ ] Week 11: FastAPI + React dashboard integration
- [ ] Week 12: Deploy (Vercel + Railway) & final presentation

---

## 📄 License

This project is licensed under the MIT License.  
Dataset: CC0 Public Domain via Kaggle.