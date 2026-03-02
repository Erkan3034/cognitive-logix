# 🧠 cognitive-logix

> **Yapay Zeka Destekli Tedarik Zinciri Dijital İkizi** — Çok katmanlı makine öğrenmesi ile teslimat gecikmelerini tahmin eder, sahteciliği tespit eder ve talebi öngörür.

[![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python)](https://python.org)
[![React](https://img.shields.io/badge/Frontend-React-61DAFB?logo=react)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/API-FastAPI-green?logo=fastapi)](https://fastapi.tiangolo.com)
[![Supabase](https://img.shields.io/badge/Veritabanı-Supabase-3ECF8E?logo=supabase)](https://supabase.com)
[![License](https://img.shields.io/badge/Lisans-MIT-yellow)](LICENSE)

---

## 📌 Proje Genel Bakış

**cognitive-logix**, uçtan uca tedarik zinciri yönetimi için bir Bilişsel Kontrol Kulesi'dir. [DataCo Smart Supply Chain Veri Seti](https://www.kaggle.com/datasets/shashwatwork/dataco-smart-supply-chain-for-big-data-analysis) üzerindeki 180.000'den fazla gerçek işlem kaydı üzerine inşa edilmiştir. Sistem yalnızca raporlamakla kalmaz; tahmin eder, tespit eder ve aksiyon önerir.

| Modül | Problem | Yaklaşım |
|-------|---------|----------|
| 🚚 **Tahminleyici Lojistik** | Bu sipariş gecikecek mi? | XGBoost / CatBoost + SHAP |
| 📦 **Talep Zekası** | Gelecek ay talep nasıl olacak? | Prophet + LSTM |
| 🛡️ **Finansal Güvenlik** | Bu sipariş sahte ya da zararlı mı? | Isolation Forest + SMOTE |

---

## 🏗️ Mimari

```
[Frontend]     React + Vite + Tailwind CSS + shadcn/ui + Recharts
                          ↓ REST API (JSON)
[Backend]      FastAPI (Python 3.10+)
                          ↓
[ML Katmanı]   XGBoost | Prophet + LSTM | Isolation Forest
                          ↓
[Veritabanı]   Supabase → PostgreSQL + Auth + Storage
                          ↓
[Deploy]       Vercel (Frontend) + Railway (Backend)
```

---

## 📁 Repo Yapısı

```
cognitive-logix/
│
├── frontend/                        # React uygulaması
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                  # shadcn/ui temel bileşenler
│   │   │   ├── charts/              # Recharts sarmalayıcılar
│   │   │   ├── ModuleA/             # Lojistik dashboard bileşenleri
│   │   │   ├── ModuleB/             # Talep tahmini bileşenleri
│   │   │   └── ModuleC/             # Fraud & risk bileşenleri
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx        # Ana genel bakış
│   │   │   ├── Logistics.jsx        # Gecikme tahmini arayüzü
│   │   │   ├── Demand.jsx           # Tahmin & simülasyon arayüzü
│   │   │   ├── Fraud.jsx            # Fraud tespit arayüzü
│   │   │   └── Login.jsx            # Supabase kimlik doğrulama
│   │   ├── lib/
│   │   │   ├── supabaseClient.js    # Supabase bağlantısı
│   │   │   └── api.js               # FastAPI çağrıları (axios)
│   │   └── App.jsx
│   ├── .env.local                   # VITE_SUPABASE_URL, VITE_API_URL
│   ├── package.json
│   └── vite.config.js
│
├── backend/                         # FastAPI uygulaması
│   ├── app/
│   │   ├── main.py                  # FastAPI giriş noktası
│   │   ├── routers/
│   │   │   ├── predict.py           # POST /predict (gecikme riski)
│   │   │   ├── forecast.py          # POST /forecast (talep tahmini)
│   │   │   └── fraud.py             # POST /fraud (anomali skoru)
│   │   ├── models/                  # Pydantic istek/yanıt şemaları
│   │   └── ml/
│   │       ├── logistics_model.py   # XGBoost çıkarımı
│   │       ├── demand_model.py      # Prophet çıkarımı
│   │       └── fraud_model.py       # Isolation Forest çıkarımı
│   ├── trained_models/              # .pkl model dosyaları (gitignored)
│   ├── requirements.txt
│   └── Dockerfile
│
├── notebooks/                       # Jupyter — model eğitimi
│   ├── module_a_logistics/          # Erkan
│   ├── module_b_demand/             # Aslı
│   └── module_c_fraud/              # Ismail
│
├── data/
│   ├── raw/                         # ⚠️ Gitignored (96MB CSV)
│   └── processed/                   # temiz_veri_final.csv, analiz_veri.csv
│
├── reports/                         # Haftalık raporlar & görseller
├── .gitignore
└── README.md
```

---

## 🚀 Kurulum

### Gereksinimler
- Node.js 18+
- Python 3.10+
- Supabase hesabı (ücretsiz tier yeterli)

### 1. Klonla
```bash
git clone https://github.com/YOUR_USERNAME/cognitive-logix.git
cd cognitive-logix
```

### 2. Frontend
```bash
cd frontend
npm install
# .env.local oluştur (opsiyonel - şu an auth devre dışı)
# VITE_API_URL=http://localhost:8000
npm run dev
```
**Not:** Supabase auth şu an devre dışı (geliştirme için). Login sayfası çalışıyor ama auth kontrolü yok.

### 3. Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
# .env dosyası şu an gerekli değil (Supabase devre dışı)
uvicorn app.main:app --reload
```

**Alternatif (PowerShell scriptleri):**
```powershell
# Terminal 1: Backend
.\start-backend.ps1

# Terminal 2: Frontend  
.\start-frontend.ps1
```

### 4. Veri
```bash
# CSV'yi Kaggle'dan indirip data/raw/ klasörüne koy
# Ardından çalıştır:
python notebooks/module_c_fraud/data_cleaning.py
```

---

## ⚠️ Geliştiriciler için Veri Kullanım Kılavuzu

> **Kritik:** İşlenmiş dosyaların tamamı her modül için uygun değildir. Model eğitiminde yanlış veri seti kullanmak hatalı ve yanıltıcı sonuçlar üretir.

| Dosya | Satır | Açıklama |
|-------|-------|----------|
| `data/processed/temiz_veri_final_latest.csv` | 180.521 | **En güncel, tam temiz set** — yeni fraud / risk / EDA çalışmaları için ana kaynak |
| `data/processed/temiz_veri_final.csv` | 180.519 | Önceki tam veri sürümü — arşiv amaçlı tutuluyor |
| `data/processed/analiz_veri.csv` | 172.765 | CANCELED + SUSPECTED_FRAUD çıkarılmış — lojistik ve talep modelleri için **ana eğitim dosyası** |

### Modül bazında hangi dosya kullanılacak:

**🚚 Modül A — Tahminleyici Lojistik → `analiz_veri.csv`**
- İptal ve fraud siparişlerinin teslimat davranışı anlamsızdır
- Bu kayıtlarla eğitim yapılırsa gecikme tahmin modeli bozulur

**📦 Modül B — Talep Zekası → `analiz_veri.csv`**
- İptal siparişlerindeki satış rakamları gerçek talebi yansıtmaz
- Bu kayıtlar dahil edilirse talep tahminleri şişer

**🛡️ Modül C — Fraud Tespiti → `temiz_veri_final_latest.csv`**
- Fraud etiketleri (`SUSPECTED_FRAUD`) bu dosyada mevcuttur
- **`analiz_veri.csv` ile fraud modeli kesinlikle eğitilmez** — fraud kayıtları bu dosyadan çıkarılmıştır

```python
# Modül A ve B için
df = pd.read_csv("data/processed/analiz_veri.csv")

# Modül C — YALNIZCA fraud modeli için (en güncel set)
df = pd.read_csv("data/processed/temiz_veri_final_latest.csv")
df["is_fraud"] = (df["Order Status"] == "SUSPECTED_FRAUD").astype(int)
```

### Veri setinde bilinçli olarak bırakılan alanlar (silmeyin):
- **Negatif karlı siparişler** (`negative_profit_flag = 1`) — gerçek iş verisi, gelir güvencesi analizinde kullanılacak
- **`Order Zipcode`** (%86 boş) — sütun korundu, coğrafi feature'lardan hariç tutuldu

---

## 🔌 API Endpoint'leri

| Metot | Endpoint | Açıklama | Sorumlu |
|-------|----------|----------|---------|
| `POST` | `/predict` | Teslimat gecikme riski skoru + SHAP açıklaması | Erkan |
| `POST` | `/forecast` | Kategori & tarih aralığına göre talep tahmini | Aslı |
| `POST` | `/fraud` | Fraud & negatif kar risk skoru | Ismail |
| `GET` | `/health` | API sağlık kontrolü | — |

### Örnek: `/predict`
```json
// İstek (Request)
{
  "shipping_mode": "Standard Class",
  "order_region": "Western Europe",
  "days_scheduled": 4,
  "category": "Sporting Goods",
  "market": "Europe"
}

// Yanıt (Response)
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

## 🔑 Temel Bulgular (Hafta 1–2 EDA)

- **%54,8 geç teslimat oranı** — neredeyse her 2 siparişten 1'i geç ulaşıyor
- **%18,7 negatif kar** — 33.784 sipariş zararlı
- **Fraud oranı: %2,25** — 43:1 sınıf dengesizliği, SMOTE zorunlu
- **Sıfır duplicate** — 180.000'den fazla kayıtta veri bütünlüğü doğrulandı
- `Product Description`: %100 boş — silindi
- `Order Zipcode`: %86 boş — coğrafi analizlerden hariç tutuldu

---

## 🧹 Veri Temizliği Özeti

| Adım | İşlem | Sonuç |
|------|-------|-------|
| Encoding | UTF-8 yerine Latin-1 | Dosya başarıyla yüklendi |
| BOM karakteri | `ï»¿Type` → `Type` | Sütun adı düzeltildi |
| Tarih sütunları | datetime'a dönüştürüldü | Zamansal analiz mümkün |
| Hassas sütunlar | Email, şifre, adres, görsel silindi | Gizlilik uyumu sağlandı |
| Boş sütunlar | `Product Description`, `Product Status` silindi | Gereksiz feature temizlendi |
| Trailing space | Tüm metin sütunları temizlendi | Kategorik tutarlılık sağlandı |
| Türetilmiş feature | `shipping_delay` (gün) | Negatif değer yok, tarihler tutarlı |
| Flag'leme | `negative_profit_flag`, `is_canceled` | Kayıtlar silinmedi, işaretlendi |
| Çıktı | `temiz_veri_final.csv`, `analiz_veri.csv` | Modellemeye hazır |

---

## 👥 Takım

| Ad Soyad | Modül | Rol |
|----------|-------|-----|
| **Erkan TURGUT** |  Modül A | Tahminleyici Lojistik Mühendisi |
| **Aslı AYDIN** |  Modül B | Talep & Envanter Analisti |
| **Ismail NAIT OUCHEN** | Modül C | Finansal Güvenlik & Full-Stack |

---

## 🗓️ Yol Haritası

- [x] Hafta 1: Araştırma, veri seti analizi, takım kurulumu, GitHub & Colab başlatma
- [x] Hafta 2: Veri temizliği, EDA, boş veri analizi, temizlenmiş CSV'ler
- [ ] Hafta 3–4: Feature engineering (Haversine mesafesi, zaman özellikleri, encoding)
- [ ] Hafta 5: Aykırı değer analizi & normalizasyon
- [ ] Hafta 6–7: Model geliştirme (XGBoost, Prophet, Isolation Forest)
- [ ] Hafta 8: Model optimizasyonu (CatBoost, LSTM, SMOTE)
- [ ] Hafta 9–10: Açıklanabilir YZ — SHAP entegrasyonu
- [ ] Hafta 11: FastAPI + React dashboard entegrasyonu
- [ ] Hafta 12: Deploy (Vercel + Railway) & final sunum

---

*Veri seti: Kaggle üzerinden alınmıştır.*