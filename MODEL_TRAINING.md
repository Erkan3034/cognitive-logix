# 🤖 Model Eğitim Rehberi

Bu rehber, diğer geliştiricilerin **trained_models** klasöründeki modelleri yerel ortamlarında eğitmelerini sağlar.

> **Not:** `.gitignore` dosyasında `backend/trained_models/` bulunduğu için bu modeller git'e yüklenmez. Her geliştirici bu rehberi izleyerek modelleri kendi makinelerinde eğitmesidir.

---

## 📋 Başlangıç Gereksinimleri

- **Python 3.10+**
- **Virtual Environment (venv)**
- **Temiz veri dosyası:** `data/temiz_veri_final_latest.csv`
- **Processed veri (Demand modeli için):** `data/processed/analiz_veri.csv`

---

## 🔧 Ortam Kurulumu

### 1. Virtual Environment Oluşturun

```powershell
# Proje kök dizinine girin
cd cognitive-logix

# Virtual environment oluşturun
python -m venv venv

# Aktivasyon (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# Aktivasyon (Windows CMD)
venv\Scripts\activate.bat

# Aktivasyon (Linux/macOS)
source venv/bin/activate
```

### 2. Gerekli Paketleri Yükleyin

```powershell
# Backend requirements'ları yükleyin
pip install --upgrade pip
pip install -r backend/requirements.txt

# Eğer ML paketleri sorun çıkarsa, ayrı ayrı yükleyin:
pip install numpy==1.24.0 pandas==2.2.3 scikit-learn==1.5.2 joblib==1.4.2
```

---

## 📊 Veri Hazırlığı

Modelleri eğitmeden önce gerekli veri dosyalarının mevcut olduğundan emin olun:

```powershell
# Gerekli dosyaları kontrol edin
Test-Path "data/temiz_veri_final_latest.csv"  # Tüm modeller için gerekli
Test-Path "data/processed/analiz_veri.csv"    # Demand modeli için gerekli
```

**Eğer dosyalar yoksa:**
1. Ham veri işleme skriptinizi çalıştırın
2. Veya hazırlanmış veri kaynaklarını sorgulayın

---

## 🚀 Modelleri Eğitme

Proje kökünde olduğunuzdan emin olun (`cd cognitive-logix`).

### Module A: Lojistik Gecikme Riski (Logistics Delay Risk)

```powershell
# Logistics modeli eğitin
python notebooks/module_a_logistics/train_logistics_model.py
```

**Çıktı:**
- `backend/trained_models/logistics_model.pkl` → Kaydedilecek model
- Console'da sınıflandırma raporu gösterilir

**Model Özellikleri:**
- Hedef: `Late_delivery_risk` (Teslimat gecikmesi riski)
- Algoritma: Random Forest Classifier (200 ağaç)
- Özellikler: Kargo modu, region, pazar, kategori, kargo gecikmesi, vs.

---

### Module B: Talep Tahmini (Demand Intelligence)

```powershell
# Demand modeli eğitin
python notebooks/module_b_demand/train_demand_model.py
```

**Çıktı:**
- `backend/trained_models/demand_model.pkl` → Kaydedilecek model
- Console'da MAE (Mean Absolute Error) gösterilir

**Model Özellikleri:**
- Hedef: Günlük satış toplamı tahmini
- Algoritma: Random Forest Regressor
- Veri Kaynağı: `data/processed/analiz_veri.csv`

---

### Module C: Sahte Sipariş Tespiti (Fraud Detection)

```powershell
# Fraud modeli eğitin
python notebooks/module_c_fraud/train_fraud_model.py
```

**Çıktı:**
- `backend/trained_models/fraud_model.pkl` → Kaydedilecek model
- Console'da sınıflandırma raporu gösterilir

**Model Özellikleri:**
- Hedef: `is_fraud` (SUSPECTED_FRAUD vs normal siparişler)
- Algoritma: Random Forest Classifier
- Özellikler: Satış tutarı, kâr, kargo gecikmesi, negatif kâr bayrağı, vs.

---

## 🎯 Hızlı Komut: Tüm Modelleri Eğitin

Tüm modelleri sırayla eğitmek için bash/PowerShell script'i yazabilirsiniz:

### PowerShell

```powershell
# tüm_modelleri_egit.ps1
Write-Host "🚀 Tüm modeller eğitiliyor..." -ForegroundColor Green

Write-Host "`n1️⃣ Lojistik modeli eğitiliyor..."
python notebooks/module_a_logistics/train_logistics_model.py

Write-Host "`n2️⃣ Talep modeli eğitiliyor..."
python notebooks/module_b_demand/train_demand_model.py

Write-Host "`n3️⃣ Sahte sipariş modeli eğitiliyor..."
python notebooks/module_c_fraud/train_fraud_model.py

Write-Host "`n✅ Tüm modeller başarıyla eğitildi!" -ForegroundColor Green
```

Çalıştırmak için:
```powershell
.\tüm_modelleri_egit.ps1
```

---

## ✅ Kontrol Listesi

- [ ] Virtual environment oluşturdum
- [ ] Paketleri yükledim (`pip install -r backend/requirements.txt`)
- [ ] Veri dosyaları var: `data/temiz_veri_final_latest.csv`
- [ ] Processed veri var: `data/processed/analiz_veri.csv` (Demand için)
- [ ] Module A (Logistics) modeli eğittim
- [ ] Module B (Demand) modeli eğittim
- [ ] Module C (Fraud) modeli eğittim
- [ ] `backend/trained_models/` klasöründe 3 `.pkl` dosyası var:
  - `logistics_model.pkl`
  - `demand_model.pkl`
  - `fraud_model.pkl`

---

## 🐛 Sorun Giderme

### ❌ "No such file or directory" hatası

```
FileNotFoundError: [Errno 2] No such file or directory: '..../data/temiz_veri_final_latest.csv'
```

**Çözüm:**
- Veri dosyasının tam yolunun doğru olduğundan emin olun
- Dosya adının yazımını kontrol edin (büyük/küçük harf duyarlılığı)
- Windows'ta `/` yerine `\` kullanmayın (Python otomatik dönüştürür)

### ❌ "sklearn/pandas/numpy" import hatası

```
ModuleNotFoundError: No module named 'sklearn'
```

**Çözüm:**
```powershell
# Virtual environment'ın aktif olduğundan emin olun
.\venv\Scripts\Activate.ps1

# Paketleri tekrar yükleyin
pip install --upgrade pip
pip install -r backend/requirements.txt
```

### ❌ "MemoryError" hatası

Büyük veri seti ile eğitim yapıyorsanız:

```powershell
# Python'a daha fazla bellek tanıtın (örnek: 4GB)
# Bunu doğrudan Python script'i içinde yapabilirsiniz
```

### ❌ Model eğitimi çok uzun sürüyor

- İlk eğitim 5-15 dakika sürebilir
- `n_jobs=-1` parametresi tüm CPU çekirdeğini kullanır
- Sistem kaynaklarıyla ilgili sorun varsa `n_jobs=1` olarak değiştirebilirsiniz

---

## 📝 Model Dosyaları

Başarılı eğitimden sonra bu dosyalar `backend/trained_models/` klasöründe olmalıdır:

| Dosya | Modül | Boyut | Açıklama |
|-------|-------|-------|----------|
| `logistics_model.pkl` | Module A | ~10-50 MB | Teslimat gecikme riski |
| `demand_model.pkl` | Module B | ~5-20 MB | Günlük talep tahmini |
| `fraud_model.pkl` | Module C | ~10-50 MB | Sahte sipariş tespiti |

---

## 🔄 Versiyon Güncellemeleri

Eğer veri güncellerse veya model performansı düşerse, modelleri yeniden eğitmek için aynı komutları çalıştırın. Yeni model dosyaları eski dosyaları üzerine yazacaktır.

---

## 📞 Destek

Model eğitimi sırasında sorun yaşarsanız:
1. Yukarıdaki "Sorun Giderme" bölümünü kontrol edin
2. Veri dosyalarının mevcut ve tam olduğundan emin olun
3. Python versiyonunu kontrol edin: `python --version` (3.10+ gerekli)
4. Virtual environment'ın aktif olduğundan emin olun
