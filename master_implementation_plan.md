# 🚀 Master Implementation Plan: Cognitive Control Tower B2B SaaS (12-Point AI Backbone)

Bu plan, sistemi bir demodan çıkarıp, **"Tahmin Eden, Karar Veren ve Açıklayan"** gerçek bir otonom SaaS (Software as a Service) platformuna dönüştürecek 12 maddelik nihai algoritma omurgasını ve geliştirme sprintlerini içerir.

## 🧬 Nihai Algoritmik Omurga (12 Teknik)

Projenin kalbini oluşturacak 12 algoritma/teknik paketi:

### Lojistik ve Gecikme (Modül A)
1. **CatBoost / LightGBM Delay Classifier:** Sipariş gecikme riski tahmini.
2. **Probability Calibration:** Risk yüzdelerini matematiksel olarak güvenilir hale getirme (Platt Scaling/Isotonic).
3. **SHAP Explainability:** “Bu tahmin neden çıktı?” sorusunun faktörel açıklaması.

### Talep ve Envanter (Modül B)
4. **Quantile Demand Forecasting:** Talep için düşük / beklenen / yüksek senaryo tahmini (%90 güven aralığı).
5. **Hierarchical Forecasting:** Toplam → bölge → kategori → SKU seviyesinde tutarlı (aşağı/yukarı uyumlu) tahmin.
6. **Croston / TSB Forecasting:** Seyrek (aralıklı) satılan ürünler için özel talep tahmini.
7. **Safety Stock Algorithm:** Dinamik güvenlik stoğu hesaplama önerisi.
8. **Reorder Point Algorithm:** Doğru zamanda "Yeniden sipariş ver" önerisi.

### Finansal Güvenlik ve Fraud (Modül C)
9. **Fraud Classifier:** Etiketli veriden (Supervised) dolandırıcılık riski tahmini.
10. **Isolation Forest / LOF:** Etiketsiz veriden (Unsupervised) bilinmeyen anomali tespiti.

### Sistem Simülasyonu ve İzleme
11. **Monte Carlo Simulation:** Manuel "What-if" (Ya şöyle olursa?) senaryo simülasyonu.
12. **Data Drift Detection:** Müşteri verisinde zamanla oluşan bozulmaları ve model kaymasını (PSI/KS) izleme.

---

## 🏃‍♂️ Geliştirme Sprintleri (Adım Adım Yol Haritası)

### 🔴 Sprint 1: Veri İzolasyonu ve Temel SaaS Altyapısı (Multi-Tenancy)
*Önce evin duvarlarını ve güvenlik sistemini kuruyoruz.*
- **Veritabanı (Supabase):** `organizations`, `api_keys` ve `usage_logs` tabloları.
- **Güvenlik (RLS):** Her tabloya `tenant_id` eklenmesi ve Row Level Security (RLS) politikaları.
- **Backend (FastAPI):** JWT üzerinden `tenant_id` okuyan yetkilendirme (middleware) katmanı.

### 🟡 Sprint 2: Dinamik Veri Alımı ve Şema Eşleştirme (Data Ingestion)
*Müşterilerin kendi verilerini sisteme aktarmasını sağlıyoruz.*
- **Veri Yükleme:** Müşterilerin CSV/Excel yükleyebileceği güvenli Supabase Storage entegrasyonu.
- **Schema Mapping Katmanı:** Kullanıcının kolon isimlerini (`Satış_Tarihi`), sistemin standart formatına (`order_date`) dönüştürecek dinamik algoritma.

### 🟢 Sprint 3: Yapay Zeka Sanayileştirmesi (Modül A ve C)
*Gecikme ve Fraud algoritmalarının inşası.*
- **Gecikme:** `CatBoost Classifier` + `Probability Calibration` + `SHAP` (1, 2 ve 3 numaralı algoritmalar).
- **Fraud:** `Fraud Classifier` + `Isolation Forest / LOF` (9 ve 10 numaralı algoritmalar).

### 🔵 Sprint 4: Talep Zekası ve Envanter Karar Motoru (Modül B)
*Zaman serisi ve aksiyon motorunun inşası.*
- **Tahmin:** `Quantile Demand Forecasting` + `Hierarchical Forecasting` + `Croston/TSB` (4, 5 ve 6 numaralı algoritmalar).
- **Aksiyon:** `Safety Stock` + `Reorder Point` (7 ve 8 numaralı algoritmalar).

### 🟣 Sprint 5: Simülasyon, İzleme ve Canlıya Alma
*Sistemin güvenliğini garanti altına alma ve ticari çıkış.*
- **Araçlar:** `Monte Carlo Simulation` + `Data Drift Detection` (11 ve 12 numaralı algoritmalar).
- **SaaS:** Lemon Squeezy faturalama entegrasyonu.
- **Canlıya Alma:** Frontend (Vercel) ve Backend (Railway) deployment.

---

## ❓ Kullanıcı Onayı ve Başlangıç

> [!IMPORTANT]
> Codex'in 12 maddelik **"Algoritmik Omurgası"** projeyi tam anlamıyla benzersiz ve pazar lideri bir SaaS yapacak kusursuzlukta. 
> Tüm bu 12 maddeyi, veri yalıtımı kurallarıyla birlikte Sprintlere başarıyla entegre ettim.
> 
> Lütfen sağdaki **Master Implementation Plan**'ı son kez incele. Her şey mükemmelse, **Sprint 1 (Veri İzolasyonu ve Supabase/PostgreSQL tabloları)** ile kod yazmaya ve projeyi ayağa kaldırmaya resmen başlıyorum. Onaylıyor musun?
