<p align="center">
  <img src="https://img.shields.io/badge/cognitive--logix-v0.1.0-blueviolet?style=for-the-badge" alt="version" />
</p>

<h1 align="center">🧠 Cognitive Logix</h1>

<p align="center">
  <strong>Yapay Zeka Destekli Tedarik Zinciri Dijital İkizi</strong><br/>
  Teslimat gecikmelerini tahmin et · Sahteciliği tespit et · Talebi öngör
</p>

<p align="center">
  <a href="https://python.org"><img src="https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white" /></a>
  <a href="https://fastapi.tiangolo.com"><img src="https://img.shields.io/badge/API-FastAPI-009688?logo=fastapi&logoColor=white" /></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/Frontend-React_18-61DAFB?logo=react&logoColor=black" /></a>
  <a href="https://vitejs.dev"><img src="https://img.shields.io/badge/Build-Vite_5-646CFF?logo=vite&logoColor=white" /></a>
  <a href="https://supabase.com"><img src="https://img.shields.io/badge/Auth-Supabase-3ECF8E?logo=supabase&logoColor=white" /></a>
  <img src="https://img.shields.io/badge/Lisans-MIT-yellow" />
</p>

---

## 📌 Proje Nedir?

**Cognitive Logix**, küresel ölçekteki tedarik zinciri operasyonlarını uçtan uca izleme, tahmin ve aksiyon öneri kapasitesine sahip bir **Bilişsel Kontrol Kulesi** platformudur.

Sistem, [DataCo Smart Supply Chain](https://www.kaggle.com/datasets/shashwatwork/dataco-smart-supply-chain-for-big-data-analysis) veri seti üzerindeki **180.000'den fazla gerçek işlem kaydını** analiz eder ve üç kritik soruya yanıt verir:

| Soru | Modül | ML Yaklaşımı |
|------|-------|-------------|
| 🚚 **Bu sipariş gecikecek mi?** | Tahminleyici Lojistik | XGBoost / CatBoost + SHAP |
| 📦 **Gelecek ay talep nasıl olacak?** | Talep Zekası | Prophet + LSTM |
| 🛡️ **Bu sipariş sahte veya zararlı mı?** | Finansal Güvenlik | Isolation Forest + SMOTE |

> **Fark:** Geleneksel BI araçlarından farklı olarak, Cognitive Logix yalnızca raporlamaz — **tahmin eder, tespit eder ve aksiyon önerir.**

---

## 🎯 Amaç ve Sunduğu Çözüm

### Problem

Küresel tedarik zincirlerinde karşılaşılan üç kritik sorun:

- **%54,8 geç teslimat oranı** — neredeyse her 2 siparişten 1'i geç ulaşıyor
- **%18,7 negatif kâr oranı** — 33.784 sipariş zarar üretiyor
- **%2,25 dolandırıcılık oranı** — 43:1 sınıf dengesizliği ile tespit güçlüğü

### Çözüm

Cognitive Logix, bu üç problemi **tek bir platform** altında çözer:

1. **Proaktif Gecikme Tahmini** — Sipariş oluşturulduğu anda gecikme riskini puanlar, SHAP ile hangi faktörün etkili olduğunu açıklar
2. **Akıllı Talep Tahmini** — Kategori bazında 12 ay ileriye tahmin üretir, envanter planlamasını destekler
3. **Gerçek Zamanlı Dolandırıcılık Tespiti** — Anomali skoru hesaplar, şüpheli siparişleri otomatik izole eder
4. **Yönetici Kokpiti** — Tüm KPI'lar tek bir dashboard'da birleşik görünümle sunulur

---

## 🏗️ Sistem Mimarisi

```
┌──────────────────────────────────────────────────────────┐
│                    FRONTEND (React 18)                    │
│  Vite · React Router · Recharts · Supabase Auth · Axios  │
│                                                          │
│  ┌─────────────┐ ┌──────────┐ ┌───────┐ ┌────────────┐  │
│  │  Dashboard   │ │ Lojistik │ │ Talep │ │ Fraud&Risk │  │
│  │  (Kokpit)    │ │ Modülü   │ │Modülü │ │  Modülü    │  │
│  └──────┬──────┘ └─────┬────┘ └───┬───┘ └──────┬─────┘  │
│         └──────────────┼─────────┼─────────────┘         │
│                        │ REST API (JSON) via Axios       │
└────────────────────────┼─────────────────────────────────┘
                         ▼
┌──────────────────────────────────────────────────────────┐
│                  BACKEND (FastAPI + Python)               │
│                                                          │
│  Routers:                                                │
│  ┌────────────┐ ┌──────────┐ ┌─────────┐ ┌───────────┐  │
│  │ /predict   │ │/forecast │ │ /fraud  │ │ /metrics  │  │
│  │ Gecikme    │ │ Talep    │ │ Anomali │ │ Dashboard │  │
│  │ Riski      │ │ Tahmini  │ │ Skoru   │ │ KPI'lar   │  │
│  └─────┬──────┘ └────┬─────┘ └────┬────┘ └─────┬─────┘  │
│        │             │            │             │        │
│  ML Katmanı:                                             │
│  ┌──────────────────────────────────────────────────┐    │
│  │  XGBoost  │  Prophet + LSTM  │  Isolation Forest │    │
│  │  + SHAP   │  + Trend Analiz  │  + SMOTE          │    │
│  └──────────────────────────────────────────────────┘    │
│                         │                                │
│              trained_models/ (.pkl dosyaları)             │
└──────────────────────────────────────────────────────────┘
                         ▼
┌──────────────────────────────────────────────────────────┐
│                      VERİ KATMANI                        │
│                                                          │
│  data/raw/          → Orijinal DataCo CSV (96 MB)        │
│  data/processed/    → Temizlenmiş & dönüştürülmüş CSV    │
│  data/              → temiz_veri_final_latest.csv         │
│                                                          │
│  Supabase (PostgreSQL) → Kimlik doğrulama & depolama     │
└──────────────────────────────────────────────────────────┘
```

---

## 🛠️ Teknoloji Yığını

### Frontend

| Teknoloji | Sürüm | Kullanım Alanı |
|-----------|-------|----------------|
| **React** | 18.3 | Bileşen tabanlı UI mimarisi |
| **Vite** | 5.1 | Geliştirme sunucusu & bundler |
| **React Router** | 6.22 | Sayfa yönlendirme (SPA) |
| **Recharts** | 2.12 | İnteraktif grafik ve veri görselleştirme |
| **Axios** | 1.7 | Backend API haberleşmesi |
| **Supabase JS** | 2.49 | Kimlik doğrulama & oturum yönetimi |
| **Vanilla CSS** | — | Özel tasarım sistemi (dark theme, glassmorphism) |

### Backend

| Teknoloji | Sürüm | Kullanım Alanı |
|-----------|-------|----------------|
| **FastAPI** | 0.115 | RESTful API çerçevesi |
| **Uvicorn** | 0.30 | ASGI sunucu (hot-reload destekli) |
| **Pydantic** | 2.10 | İstek/yanıt veri doğrulama şemaları |
| **Pandas** | 2.2 | Veri işleme & dönüşüm |
| **scikit-learn** | 1.8 | ML modelleri eğitimi & servisi |

### Makine Öğrenimi & Veri Bilimi

| Teknoloji | Kullanım Alanı |
|-----------|----------------|
| **XGBoost** | Teslimat gecikme tahmini (Modül A) |
| **Prophet** | Zaman serisi talep tahmini (Modül B) |
| **Isolation Forest** | Anomali / dolandırıcılık tespiti (Modül C) |
| **SHAP** | Açıklanabilir YZ — model kararlarının yorumlanması |
| **SMOTE** | Dengesiz sınıf problemi çözümü (Fraud %2.25) |
| **Matplotlib / Seaborn** | EDA ve model analiz grafikleri |

### Altyapı

| Teknoloji | Kullanım Alanı |
|-----------|----------------|
| **Supabase** | PostgreSQL veritabanı + Auth + Storage |
| **Vercel** | Frontend deploy (planlanan) |
| **Railway** | Backend deploy (planlanan) |
| **Jupyter Lab** | Araştırma, EDA ve model geliştirme |

---

## 📁 Proje Yapısı

```
cognitive-logix/
│
├── frontend/                          # React uygulaması
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx          # Yönetici kokpiti — KPI genel bakış
│   │   │   ├── Logistics.jsx          # Gecikme tahmini arayüzü
│   │   │   ├── Demand.jsx             # Talep tahmini & simülasyon
│   │   │   ├── Fraud.jsx              # Dolandırıcılık & risk analizi
│   │   │   └── Login.jsx              # Supabase kimlik doğrulama
│   │   ├── components/
│   │   │   ├── ModuleA/               # Lojistik dashboard bileşenleri
│   │   │   ├── ModuleB/               # Talep tahmini bileşenleri
│   │   │   ├── ModuleC/               # Fraud & risk bileşenleri
│   │   │   ├── charts/                # Recharts sarmalayıcıları
│   │   │   └── ui/                    # Ortak UI bileşenleri
│   │   ├── lib/
│   │   │   ├── api.js                 # FastAPI çağrıları (Axios)
│   │   │   └── supabaseClient.js      # Supabase bağlantısı
│   │   ├── App.jsx                    # Ana uygulama & routing
│   │   └── styles.css                 # Global tasarım sistemi
│   ├── vite.config.js
│   └── package.json
│
├── backend/                           # FastAPI uygulaması
│   ├── app/
│   │   ├── main.py                    # Giriş noktası + CORS
│   │   ├── routers/
│   │   │   ├── predict.py             # POST /predict — gecikme riski
│   │   │   ├── forecast.py            # POST /forecast — talep tahmini
│   │   │   ├── fraud.py               # POST /fraud — anomali skoru
│   │   │   └── metrics.py             # GET /metrics/overview — KPI'lar
│   │   ├── models/                    # Pydantic istek/yanıt şemaları
│   │   └── ml/
│   │       ├── logistics_model.py     # XGBoost çıkarım motoru
│   │       ├── demand_model.py        # Prophet çıkarım motoru
│   │       └── fraud_model.py         # Isolation Forest çıkarım motoru
│   ├── trained_models/                # Eğitilmiş .pkl dosyaları
│   └── requirements.txt
│
├── notebooks/                         # Jupyter — araştırma & model eğitimi
│   ├── module_a_logistics/            # Lojistik modeli EDA & eğitim
│   ├── module_b_demand/               # Talep modeli EDA & eğitim
│   ├── module_c_fraud/                # Fraud modeli EDA & eğitim
│   └── analysis/                      # Grafik 1–12 analiz notebook'u
│
├── data/
│   ├── raw/                           # Orijinal DataCo CSV (gitignored)
│   ├── processed/                     # temiz_veri_final.csv, analiz_veri.csv
│   └── temiz_veri_final_latest.csv    # En güncel tam temiz veri seti
│
├── analysis_images/                   # Üretilen 12+ analiz grafiği (PNG)
├── reports/                           # Haftalık ilerleme raporları
├── requirements.txt                   # Python bağımlılıkları
├── start-backend.ps1                  # Backend başlatma scripti
└── start-frontend.ps1                 # Frontend başlatma scripti
```

---

## 🔌 API Endpoint'leri

| Metot | Endpoint | Açıklama |
|-------|----------|----------|
| `GET` | `/health` | API sağlık kontrolü |
| `GET` | `/metrics/overview` | Dashboard KPI'ları (zamanında teslimat, talep riski, finansal maruziyet) |
| `POST` | `/predict` | Teslimat gecikme riski skoru + SHAP açıklaması |
| `POST` | `/forecast` | Kategori & tarih aralığına göre talep tahmini |
| `POST` | `/fraud` | Dolandırıcılık & anomali risk skoru |

### Örnek — Gecikme Tahmini (`POST /predict`)

```json
// İstek
{
  "shipping_mode": "Standard Class",
  "order_region": "Western Europe",
  "days_scheduled": 4,
  "category": "Sporting Goods",
  "market": "Europe",
  "sales": 150.0,
  "quantity": 2
}

// Yanıt
{
  "delay_risk": 0.87,
  "label": "Yüksek Risk",
  "shap_explanation": {
    "shipping_mode": 0.34,
    "order_region": 0.28,
    "days_scheduled": 0.15
  }
}
```

---

## 📊 Analiz Grafikleri

Notebook çalıştırılarak `analysis_images/` klasörüne 12 adet grafik üretilmektedir:

<table>
<tr><th colspan="3">🟠 Veri Analizi Grafikleri</th></tr>
<tr><td>1</td><td>Öznitelik Korelasyon Isı Haritası</td><td>Correlation Heatmap</td></tr>
<tr><td>2</td><td>Aylık Satış Trendi (Top 5 Kategori)</td><td>Çizgi Grafiği</td></tr>
<tr><td>3</td><td>Haversine Mesafesi Dağılımı</td><td>Histogram</td></tr>
<tr><td>4</td><td>Fraud vs Normal — Z-Skoru</td><td>Box Plot</td></tr>
<tr><th colspan="3">🟢 Model ve Analiz Grafikleri</th></tr>
<tr><td>5</td><td>Outlier Dağılımı (Fraud vs Normal)</td><td>Box Plot</td></tr>
<tr><td>6</td><td>Normalizasyon Öncesi / Sonrası</td><td>Before/After Histogram</td></tr>
<tr><td>7</td><td>Karar Ağacı (max_depth=5)</td><td>Tree Visualization</td></tr>
<tr><td>8</td><td>Sınıflandırma Sonuçları</td><td>Confusion Matrix</td></tr>
<tr><th colspan="3">🔵 Model Çıktısı Grafikleri</th></tr>
<tr><td>9</td><td>SHAP Öznitelik Önem Sıralaması</td><td>Summary Plot</td></tr>
<tr><td>10</td><td>ROC-AUC (Decision Tree vs XGBoost)</td><td>ROC Curve</td></tr>
<tr><td>11</td><td>Prophet 12 Aylık Talep Tahmini</td><td>Forecast + Components</td></tr>
<tr><td>12</td><td>Isolation Forest Anomali Skoru</td><td>Histogram + Crosstab</td></tr>
</table>

---

## 🚀 Kurulum ve Çalıştırma

### Gereksinimler

- **Python** 3.10+
- **Node.js** 18+
- Supabase hesabı (ücretsiz tier yeterli — opsiyonel)

### 1. Klonla

```bash
git clone https://github.com/Erkan3034/cognitive-logix.git
cd cognitive-logix
```

### 2. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate              # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload      # http://localhost:8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                        # http://localhost:5173
```

### 4. Veri Hazırlığı

```bash
# DataCo CSV'yi Kaggle'dan indirip data/raw/ klasörüne koy
# Ardından temizleme script'ini çalıştır:
python notebooks/module_c_fraud/data_cleaning.py
```

### Hızlı Başlangıç (PowerShell)

```powershell
# Terminal 1 — Backend
.\start-backend.ps1

# Terminal 2 — Frontend
.\start-frontend.ps1
```

---

## 🤖 Model Eğitimi

> **⚠️ NOT:** `backend/trained_models/` klasörü `.gitignore` dosyasında yer aldığı için modeller git deposunda saklanmazlar. Her geliştirici modelleri kendi makinelerinde eğitmelidir.

### Otomatik Eğitim (Önerilen)

Tüm modelleri tek bir komutla eğitmek için:

```powershell
# Proje kök dizinine girin
cd cognitive-logix

# Eğitim script'ini çalıştırın (venv otomatik oluşturulacak)
.\train_all_models.ps1
```

**Bu komut otomatik olarak:**
- ✅ Virtual environment oluşturur (yoksa)
- ✅ Tüm gerekli paketleri yükler
- ✅ 3 modeli sırayla eğitir
- ✅ Eğitim sonuçlarını gösterir

### Elle Eğitim

Modelleri ayrı ayrı eğitmek için [**MODEL_TRAINING.md**](MODEL_TRAINING.md) dosyasını okuyun. Dosya şunları içerir:

- 📖 Adım adım kurulum rehberi
- 🎯 Her modülün eğitim komutları
- 🐛 Sorun giderme ipuçları
- 🔍 Veri gereksinimlerine ilişkin kontrol listesi

### Eğitim Sonrası Kontrolü

Başarılı eğitimden sonra `backend/trained_models/` klasöründe şu dosyalar olmalıdır:

```
backend/trained_models/
├── logistics_model.pkl    (Lojistik gecikme riski)
├── demand_model.pkl       (Talep tahmini)
└── fraud_model.pkl        (Sahte sipariş tespiti)
```

Backend başlatıldığında bu modeller otomatik olarak yüklenir.

---

## ⚠️ Veri Kullanım Kılavuzu

> **Kritik:** Her modül için doğru veri seti kullanılmalıdır. Yanlış veri seti yanıltıcı sonuçlar üretir.

| Dosya | Satır | Kullanım |
|-------|-------|----------|
| `temiz_veri_final_latest.csv` | 180.521 | **En güncel tam temiz set** — Fraud modeli & EDA |
| `analiz_veri.csv` | 172.765 | CANCELED + FRAUD çıkarılmış — Lojistik & Talep modelleri |

```python
# Modül A (Lojistik) ve Modül B (Talep) için
df = pd.read_csv("data/processed/analiz_veri.csv")

# Modül C (Fraud) için — YALNIZCA bu veri seti
df = pd.read_csv("data/temiz_veri_final_latest.csv")
df["is_fraud"] = (df["Order Status"] == "SUSPECTED_FRAUD").astype(int)
```

---

## 🔍 Temel Bulgular

| Bulgu | Değer | Etki |
|-------|-------|------|
| Geç teslimat oranı | **%54,8** | Her 2 siparişten 1'i geç |
| Negatif kârlı siparişler | **33.784 (%18,7)** | Ciddi gelir kaybı riski |
| Dolandırıcılık oranı | **%2,25** | 43:1 sınıf dengesizliği — SMOTE zorunlu |
| Boş `Product Description` | **%100** | Kaldırıldı |
| Boş `Order Zipcode` | **%86** | Coğrafi analizden hariç tutuldu |
| Duplicate kayıt | **0** | 180K+ kayıtta veri bütünlüğü doğrulandı |

---

## 🧹 Veri Temizleme Pipeline

| Adım | İşlem | Sonuç |
|------|-------|-------|
| Encoding düzeltme | Latin-1 → UTF-8 | Dosya başarıyla yüklendi |
| BOM temizliği | `ï»¿Type` → `Type` | Sütun adı normalize edildi |
| Tarih dönüşümü | String → datetime | Zamansal analiz yapılabilir |
| Gizlilik uyumu | Email, şifre, adres, görsel silindi | KVKK / GDPR uyumlu |
| Boş sütunlar | `Product Description`, `Product Status` kaldırıldı | Gereksiz feature temizlendi |
| Trailing whitespace | Tüm metin sütunları temizlendi | Kategorik tutarlılık sağlandı |
| Feature mühendisliği | `shipping_delay`, `negative_profit_flag`, `is_canceled` türetildi | Modelleme için hazır |
| Winsorization | `Sales_winsor`, `Order Item Product Price_winsor` | Aykırı değer etkisi azaltıldı |
| Log dönüşümü | `Sales_log1p`, `Order Item Product Price_log1p` | Çarpık dağılım düzeltildi |

---

## 👥 Takım

| Ad Soyad | Modül | Rol |
|----------|-------|-----|
| **Erkan TURGUT** | Modül A | Tahminleyici Lojistik Mühendisi |
| **Aslı AYDIN** | Modül B | Talep & Envanter Analisti |
| **Ismail NAIT OUCHEN** | Modül C | Finansal Güvenlik & Full-Stack |

---

## 🗺️ Yol Haritası

- [x] Hafta 1 — Araştırma, veri seti analizi, takım kurulumu
- [x] Hafta 2 — Veri temizliği, EDA, boş veri analizi
- [x] Hafta 3–4 — Feature engineering (Haversine, zaman özellikleri, encoding)
- [x] Hafta 5 — Aykırı değer analizi & normalizasyon
- [ ] Hafta 6–7 — Model geliştirme (XGBoost, Prophet, Isolation Forest)
- [ ] Hafta 8 — Model optimizasyonu (CatBoost, LSTM, SMOTE)
- [ ] Hafta 9–10 — Açıklanabilir YZ — SHAP entegrasyonu
- [ ] Hafta 11 — FastAPI + React dashboard entegrasyonu
- [ ] Hafta 12 — Deploy (Vercel + Railway) & final sunum

---

## 📜 Lisans

Bu proje [MIT Lisansı](LICENSE) ile lisanslanmıştır.

---

<p align="center">
  <em>Veri seti: <a href="https://www.kaggle.com/datasets/shashwatwork/dataco-smart-supply-chain-for-big-data-analysis">Kaggle — DataCo Smart Supply Chain</a></em>
</p>