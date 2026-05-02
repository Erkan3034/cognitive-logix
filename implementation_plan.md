# 🧠 Yapay Zeka Altyapısını Sanayileştirme Planı

Bu plan, projeyi bir okul/demo projesinden çıkarıp müşteriye satılabilecek, endüstri standardında, otonom ve güven veren bir Bilişsel Kontrol Kulesi'ne dönüştürmeyi amaçlar.

## 🎯 Hedef Değişiklikler

Mevcut yapıdaki tek tip "Random Forest" yaklaşımını tamamen kaldırıp, her problemin doğasına uygun özel algoritmalar entegre edeceğiz.

### 1. Modül A: Tahminleyici Lojistik (XGBoost + SHAP)
- **Kaldırılacak:** `RandomForestClassifier`
- **Yeni Model:** `XGBoost` (veya `LightGBM`)
- **Yeni Yetenek:** SHAP entegrasyonu eklenecek.
- **Backend Çıktısı:** Sadece risk skoru değil, `{"gecikme_riski": 0.85, "nedenler": {"shipping_mode": 0.40, "market": 0.20}}` şeklinde SHAP değerleri JSON olarak dönecek.

### 2. Modül B: Talep Zekası (Prophet)
- **Kaldırılacak:** `RandomForestRegressor`
- **Yeni Model:** Meta `Prophet`
- **Yeni Yetenek:** Mevsimsellik, tatil günleri ve haftalık trendleri hesaba katan güven aralıklı (%80 alt/üst bant) gerçek zaman serisi tahmini.

### 3. Modül C: Finansal Güvenlik (Isolation Forest + SMOTE)
- **Kaldırılacak:** `RandomForestClassifier`
- **Yeni Model:** `Isolation Forest` (Yarı denetimli anomali tespiti) ve veri dengesizliği için `imbalanced-learn` kütüphanesinden `SMOTE`.
- **Yeni Yetenek:** Bir sipariş geldiğinde anında anomali skoru (z-score mantığıyla) hesaplanıp sistem tarafından kırmızı bayrak çekilecek.

---

## 🛠️ Uygulama Adımları

### Adım 1: Bağımlılıkların Güncellenmesi
`requirements.txt` dosyasına aşağıdaki endüstri standardı kütüphaneler eklenecek:
```text
xgboost>=2.0.3
prophet>=1.1.5
shap>=0.45.0
imbalanced-learn>=0.12.0
```

### Adım 2: Training (Eğitim) Scriptlerinin Yeniden Yazılması
`notebooks/` altındaki üç ana eğitim dosyası tamamen güncellenecek:
1. `train_logistics_model.py` ➔ XGBoost + SHAP explainer kaydetme
2. `train_demand_model.py` ➔ DataFrame'i Prophet formatına (ds, y) çevirip modeli eğitme
3. `train_fraud_model.py` ➔ SMOTE ile azınlık sınıfını sentetik çoğaltıp Isolation Forest eğitme

### Adım 3: Backend API Entegrasyonu
`backend/app/ml/` klasöründeki inference (çıkarım) kodları, yeni eğitilen `.pkl` modellerine ve SHAP çıktılarına uyumlu hale getirilecek.

### Adım 4: Frontend (Arayüz) Uyumu
Eğer frontend şu anda SHAP açıklamalarını desteklemiyorsa (UI'da yoksa), gelen "Neden" json verisini ekranda "Kargo Tipi %40 Etkiledi" şeklinde gösterecek basit barlar eklenecek.

---

## ⚠️ Kullanıcı İncelemesi Gerekenler

> [!IMPORTANT]
> **Prophet Kurulumu:** Prophet kütüphanesi bazen C++ derleyicisi (Stan) gerektirdiği için Windows'ta kurulumu inatçı olabilir. Eğer sorun yaşarsak Prophet yerine Nixtla `StatsForecast` (çok daha hafif ve hızlı) kullanabiliriz. Ne dersiniz?

> [!NOTE]
> Modelleri yeniden eğitmemiz gerekecek. `train_all_models.ps1` scriptini çalıştırıp tüm yeni `.pkl` dosyalarını üreteceğiz.

## 🧪 Doğrulama Planı
1. `requirements.txt` güncellenip kütüphaneler hatasız yüklenecek.
2. 3 eğitim scripti de çalıştırılarak `.pkl` dosyalarının başarıyla oluştuğu teyit edilecek.
3. Backend ayağa kaldırılarak Postman/Thunder Client ile endpointlere istek atılacak ve SHAP değerlerinin geldiği doğrulanacak.
