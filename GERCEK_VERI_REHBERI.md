# 🚀 Gerçek Veri ile Çalışma Rehberi

Bu rehber, cognitive-logix projesinde gerçek CSV verilerini kullanarak modelleri eğitip API'de kullanma sürecini açıklar.

---

## 📋 Genel Akış

```
1. Notebook'larda Model Eğitimi (Jupyter)
   ↓
2. Model Kaydetme (.pkl → backend/trained_models/)
   ↓
3. Backend'de Model Yükleme (app/ml/*.py)
   ↓
4. API Endpoint'lerinde Gerçek Tahmin
   ↓
5. Frontend'de Gerçek Formlar ve Sonuçlar
```

---

## 📊 1. Veri Dosyaları

### Mevcut Veri Dosyaları

| Dosya | Satır | Kullanım |
|-------|-------|----------|
| `data/processed/temiz_veri_final_latest.csv` | 180,521 | **En güncel tam temiz set** — fraud / risk / EDA için ana kaynak |
| `data/processed/analiz_veri.csv` | 172,765 | **Lojistik ve talep modelleri için eğitim dosyası** - CANCELED + SUSPECTED_FRAUD çıkarılmış |
| `data/processed/temiz_veri_final.csv` | 180,519 | Önceki tam veri sürümü (v1) |
| `data/processed/DataCoSupplyChainDataset-Cleaned.csv` | ~180K | Temizlenmiş ham veri |

### Hangi Dosyayı Kullanmalı?

- **Module A (Logistics - Erkan)**: `analiz_veri.csv` → Geç teslimat tahmini
- **Module B (Demand - Aslı)**: `analiz_veri.csv` → Talep tahmini
- **Module C (Fraud - Ismail)**: `temiz_veri_final_latest.csv` → Fraud flag'leri ve en güncel temizlik

---

## 🔬 1. Notebook'larda Model Eğitimi

### Örnek: Module A - Logistics Model

**Dosya**: `notebooks/module_a_logistics/train_logistics_model.ipynb` (oluşturulacak)

```python
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import xgboost as xgb
import joblib
import os

# 1. VERİ YÜKLEME
df = pd.read_csv("../../data/processed/analiz_veri.csv", encoding="utf-8-sig")
print(f"Veri boyutu: {df.shape}")

# 2. FEATURE ENGINEERING
# Örnek: Geç teslimat hedef değişkeni
df['is_late'] = (df['Delivery Status'] == 'Late delivery').astype(int)

# Kategorik değişkenleri encode et
categorical_cols = ['Shipping Mode', 'Order Region', 'Market', 'Category Name']
label_encoders = {}
for col in categorical_cols:
    le = LabelEncoder()
    df[f'{col}_encoded'] = le.fit_transform(df[col].astype(str))
    label_encoders[col] = le

# 3. FEATURE SEÇİMİ
feature_cols = [
    'Days for shipping (real)',
    'Days for shipment (scheduled)',
    'Shipping Mode_encoded',
    'Order Region_encoded',
    'Market_encoded',
    'Category Name_encoded',
    'Sales',
    'Order Item Quantity'
]

X = df[feature_cols]
y = df['is_late']

# 4. TRAIN/TEST SPLIT
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# 5. MODEL EĞİTİMİ
model = xgb.XGBClassifier(
    n_estimators=100,
    max_depth=6,
    learning_rate=0.1,
    random_state=42
)
model.fit(X_train, y_train)

# 6. DEĞERLENDİRME
from sklearn.metrics import accuracy_score, classification_report
y_pred = model.predict(X_test)
print(f"Accuracy: {accuracy_score(y_test, y_pred)}")
print(classification_report(y_test, y_pred))

# 7. MODEL KAYDETME
os.makedirs("../../backend/trained_models", exist_ok=True)
joblib.dump(model, "../../backend/trained_models/logistics_model.pkl")
joblib.dump(label_encoders, "../../backend/trained_models/logistics_encoders.pkl")

print("✅ Model kaydedildi: backend/trained_models/logistics_model.pkl")
```

---

## 💾 2. Backend'de Model Yükleme

### `backend/app/ml/logistics_model.py` Güncelleme

```python
import joblib
import os
from pathlib import Path
from typing import Any, Dict

# Model ve encoder'ları yükle (lazy loading)
_model = None
_encoders = None

def _load_model():
    global _model, _encoders
    if _model is None:
        model_path = Path(__file__).parent.parent.parent / "trained_models" / "logistics_model.pkl"
        encoders_path = Path(__file__).parent.parent.parent / "trained_models" / "logistics_encoders.pkl"
        
        if not model_path.exists():
            raise FileNotFoundError(f"Model bulunamadı: {model_path}")
        
        _model = joblib.load(model_path)
        _encoders = joblib.load(encoders_path)
    return _model, _encoders

def predict_delay_risk(features: Dict[str, Any]) -> float:
    """
    Gerçek model ile tahmin yap.
    
    Args:
        features: {
            "shipping_mode": "Standard Class",
            "order_region": "Western Europe",
            "days_scheduled": 4,
            "category": "Sporting Goods",
            "market": "Europe",
            "sales": 150.0,
            "quantity": 2
        }
    
    Returns:
        delay_risk: 0.0-1.0 arası risk skoru
    """
    model, encoders = _load_model()
    
    # Feature'ları encode et
    encoded_features = {}
    for col, encoder in encoders.items():
        value = features.get(col.lower().replace(" ", "_"), "")
        try:
            encoded_features[f"{col}_encoded"] = encoder.transform([str(value)])[0]
        except ValueError:
            # Bilinmeyen kategori için default değer
            encoded_features[f"{col}_encoded"] = 0
    
    # Sayısal feature'ları ekle
    encoded_features["Days for shipping (real)"] = features.get("days_real", 0)
    encoded_features["Days for shipment (scheduled)"] = features.get("days_scheduled", 0)
    encoded_features["Sales"] = features.get("sales", 0.0)
    encoded_features["Order Item Quantity"] = features.get("quantity", 1)
    
    # Model ile tahmin
    # XGBoost predict_proba kullan (risk skoru)
    risk_score = model.predict_proba([list(encoded_features.values())])[0][1]
    
    return float(risk_score)
```

---

## 🔌 3. API Endpoint'lerini Güncelleme

### `backend/app/routers/predict.py` - Zaten Hazır!

```python
from fastapi import APIRouter
from app.models.predict import PredictRequest, PredictResponse
from app.ml.logistics_model import predict_delay_risk

router = APIRouter(tags=["logistics"])

@router.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    """
    Gerçek model ile tahmin yap.
    
    Request body:
    {
        "features": {
            "shipping_mode": "Standard Class",
            "order_region": "Western Europe",
            "days_scheduled": 4,
            "category": "Sporting Goods",
            "market": "Europe",
            "sales": 150.0,
            "quantity": 2
        }
    }
    """
    score = predict_delay_risk(req.features)
    return PredictResponse(delay_risk=score)
```

**Not**: Bu dosya zaten doğru yapılandırılmış! Sadece `logistics_model.py` içindeki `predict_delay_risk` fonksiyonunu gerçek model ile değiştirmeniz yeterli.

---

## 🎨 4. Frontend'de Gerçek Formlar

### `frontend/src/pages/Logistics.jsx` Güncelleme

```jsx
import { useState } from "react";
import { postPredict } from "../lib/api.js";

export default function Logistics() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    shipping_mode: "Standard Class",
    order_region: "Western Europe",
    days_scheduled: 4,
    category: "Sporting Goods",
    market: "Europe",
    sales: 150.0,
    quantity: 2
  });

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await postPredict({ features: formData });
      setResult(data);
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <h2>🚚 Logistics - Delay Prediction</h2>
      
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12, marginBottom: 20 }}>
        <label>
          Shipping Mode:
          <select 
            value={formData.shipping_mode}
            onChange={(e) => setFormData({...formData, shipping_mode: e.target.value})}
          >
            <option>Standard Class</option>
            <option>Second Class</option>
            <option>First Class</option>
            <option>Same Day</option>
          </select>
        </label>
        
        <label>
          Order Region:
          <input
            type="text"
            value={formData.order_region}
            onChange={(e) => setFormData({...formData, order_region: e.target.value})}
          />
        </label>
        
        <label>
          Days Scheduled:
          <input
            type="number"
            value={formData.days_scheduled}
            onChange={(e) => setFormData({...formData, days_scheduled: parseInt(e.target.value)})}
          />
        </label>
        
        <label>
          Category:
          <input
            type="text"
            value={formData.category}
            onChange={(e) => setFormData({...formData, category: e.target.value})}
          />
        </label>
        
        <label>
          Market:
          <input
            type="text"
            value={formData.market}
            onChange={(e) => setFormData({...formData, market: e.target.value})}
          />
        </label>
        
        <label>
          Sales ($):
          <input
            type="number"
            step="0.01"
            value={formData.sales}
            onChange={(e) => setFormData({...formData, sales: parseFloat(e.target.value)})}
          />
        </label>
        
        <label>
          Quantity:
          <input
            type="number"
            value={formData.quantity}
            onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value)})}
          />
        </label>
        
        <button type="submit" disabled={loading}>
          {loading ? "Predicting..." : "Predict Delay Risk"}
        </button>
      </form>
      
      {result && (
        <div style={{ padding: 16, background: "#f6f6f6", borderRadius: 8 }}>
          <h3>Sonuç:</h3>
          {result.error ? (
            <p style={{ color: "red" }}>Hata: {result.error}</p>
          ) : (
            <>
              <p><strong>Delay Risk:</strong> {(result.delay_risk * 100).toFixed(1)}%</p>
              <p><strong>Risk Seviyesi:</strong> {
                result.delay_risk > 0.7 ? "🔴 Yüksek" :
                result.delay_risk > 0.4 ? "🟡 Orta" : "🟢 Düşük"
              }</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## 📝 Özet: Adım Adım Yapılacaklar

### Module A (Logistics - Erkan)

1. ✅ `notebooks/module_a_logistics/train_logistics_model.ipynb` oluştur
2. ✅ CSV'den veri yükle, feature engineering yap
3. ✅ XGBoost model eğit
4. ✅ Model'i `backend/trained_models/logistics_model.pkl` olarak kaydet
5. ✅ `backend/app/ml/logistics_model.py` içindeki `predict_delay_risk` fonksiyonunu gerçek model ile güncelle
6. ✅ `frontend/src/pages/Logistics.jsx` formunu gerçek input'larla güncelle

### Module B (Demand - Aslı)

1. ✅ `notebooks/module_b_demand/train_demand_model.ipynb` oluştur
2. ✅ Prophet veya LSTM ile talep tahmini modeli eğit
3. ✅ Model'i `backend/trained_models/demand_model.pkl` olarak kaydet
4. ✅ `backend/app/ml/demand_model.py` güncelle
5. ✅ `frontend/src/pages/Demand.jsx` formunu güncelle

### Module C (Fraud - Ismail)

1. ✅ `notebooks/module_c_fraud/train_fraud_model.ipynb` oluştur
2. ✅ Isolation Forest veya benzeri anomaly detection modeli eğit
3. ✅ Model'i `backend/trained_models/fraud_model.pkl` olarak kaydet
4. ✅ `backend/app/ml/fraud_model.py` güncelle
5. ✅ `frontend/src/pages/Fraud.jsx` formunu güncelle

---

## ⚠️ Önemli Notlar

1. **Model Dosyaları Git'te Olmamalı**: `backend/trained_models/*.pkl` dosyaları `.gitignore`'da olmalı (büyük dosyalar)

2. **Encoding Uyumluluğu**: Notebook'da kullandığınız LabelEncoder'ları da kaydedin, backend'de aynı encoder'ları kullanın

3. **Feature Sırası**: Model eğitirken kullandığınız feature sırası, backend'de de aynı olmalı

4. **Hata Yönetimi**: Backend'de model yoksa veya hata varsa, kullanıcıya anlamlı hata mesajı döndürün

---

## 🧪 Test Etme

1. Backend'i başlat: `uvicorn app.main:app --reload`
2. Frontend'i başlat: `npm run dev`
3. Browser'da `http://localhost:5173/logistics` aç
4. Formu doldur ve "Predict" butonuna tıkla
5. Gerçek tahmin sonucunu gör!

---

