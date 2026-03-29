# ============================================================
# train_all_models.ps1
# Tüm ML modellerini sırayla eğitme scripti
# ============================================================

param(
    [switch]$Setup = $false  # -Setup flag'i ile venv kurulumuna dahil et
)

$ErrorActionPreference = "Stop"
$PROJECT_ROOT = $PSScriptRoot

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "🤖 Cognitive Logix - Model Eğitim Sistemi" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan

# ============================================================
# ADIM 1: Venv Kontrolü ve Kurulumu
# ============================================================
Write-Host "`n📦 Adım 1: Virtual Environment Kontrolü" -ForegroundColor Yellow

if (Test-Path "$PROJECT_ROOT\venv\Scripts\Activate.ps1") {
    Write-Host "✅ Virtual environment zaten mevcut" -ForegroundColor Green
} else {
    Write-Host "⚠️ Virtual environment bulunamadı" -ForegroundColor Yellow
    
    if ($Setup -or (Read-Host "Virtual environment yüklemek ister misiniz? (y/n)") -eq "y") {
        Write-Host "🔨 Virtual environment oluşturuluyor..." -ForegroundColor Cyan
        python -m venv "$PROJECT_ROOT\venv"
        Write-Host "✅ Virtual environment oluşturuldu" -ForegroundColor Green
    } else {
        Write-Host "❌ Virtual environment olmadan devam edemez!" -ForegroundColor Red
        exit 1
    }
}

# ============================================================
# ADIM 2: Virtual Environment Aktivasyonu
# ============================================================
Write-Host "`n🔌 Adım 2: Virtual Environment Aktivasyonu" -ForegroundColor Yellow

try {
    & "$PROJECT_ROOT\venv\Scripts\Activate.ps1"
    Write-Host "✅ Virtual environment aktif edildi" -ForegroundColor Green
} catch {
    Write-Host "❌ Virtual environment aktivasyonu başarısız oldu!" -ForegroundColor Red
    exit 1
}

# ============================================================
# ADIM 3: Bağımlılıkları Yükleme
# ============================================================
Write-Host "`n📚 Adım 3: Gerekli Paketleri Yükleme" -ForegroundColor Yellow

Write-Host "pip güncellemesi yapılıyor..." -ForegroundColor Cyan
pip install --upgrade pip --quiet

Write-Host "Backend paketleri yükleniyor..." -ForegroundColor Cyan
if (Test-Path "$PROJECT_ROOT\backend\requirements.txt") {
    pip install -r "$PROJECT_ROOT\backend\requirements.txt" --quiet
    Write-Host "✅ Paketler başarıyla yüklendi" -ForegroundColor Green
} else {
    Write-Host "⚠️ requirements.txt bulunamadı" -ForegroundColor Yellow
}

# ============================================================
# ADIM 4: Veri Dosyaları Kontrolü
# ============================================================
Write-Host "`n📊 Adım 4: Veri Dosyaları Kontrolü" -ForegroundColor Yellow

$data_file = "$PROJECT_ROOT\data\temiz_veri_final_latest.csv"
$processed_file = "$PROJECT_ROOT\data\processed\analiz_veri.csv"

if (-not (Test-Path $data_file)) {
    Write-Host "❌ Ana veri dosyası bulunamadı: $data_file" -ForegroundColor Red
    Write-Host "💡 Lütfen veri dosyasının mevcut olduğundan emin olun!" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Ana veri dosyası: $data_file" -ForegroundColor Green

if (-not (Test-Path $processed_file)) {
    Write-Host "⚠️ Processed veri dosyası bulunamadı (Demand modeli atlanacak)" -ForegroundColor Yellow
    $skip_demand = $true
} else {
    Write-Host "✅ Processed veri dosyası: $processed_file" -ForegroundColor Green
    $skip_demand = $false
}

# ============================================================
# ADIM 5: Model Eğitimi
# ============================================================
Write-Host "`n🚀 Adım 5: Model Eğitimi Başlatılıyor" -ForegroundColor Yellow

# Output klasöresini oluştur
$model_dir = "$PROJECT_ROOT\backend\trained_models"
if (-not (Test-Path $model_dir)) {
    New-Item -ItemType Directory -Path $model_dir -Force | Out-Null
    Write-Host "📁 Model klasörü oluşturuldu: $model_dir" -ForegroundColor Cyan
}

# Module A: Logistics
Write-Host "`n" 
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta
Write-Host "1️⃣  Module A: Lojistik Gecikme Riski" -ForegroundColor Magenta
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta

$logistics_script = "$PROJECT_ROOT\notebooks\module_a_logistics\train_logistics_model.py"
if (Test-Path $logistics_script) {
    try {
        Write-Host "⏳ Eğitim başlatılıyor..." -ForegroundColor Cyan
        python "$logistics_script"
        
        $model_file = "$model_dir\logistics_model.pkl"
        if (Test-Path $model_file) {
            $size = (Get-Item $model_file).Length / 1MB
            Write-Host "✅ Logistics modeli başarıyla eğitildi" -ForegroundColor Green
            Write-Host "   📁 $model_file ($("{0:F2}" -f $size) MB)" -ForegroundColor Green
        }
    } catch {
        Write-Host "❌ Logistics modeli eğitimi başarısız oldu:" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
    }
} else {
    Write-Host "❌ Training script bulunamadı: $logistics_script" -ForegroundColor Red
}

# Module B: Demand
if ($skip_demand) {
    Write-Host "`n" 
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta
    Write-Host "2️⃣  Module B: Talep Tahmini (ATLANIDI)" -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta
    Write-Host "⚠️ Processed veri dosyası bulunamadı" -ForegroundColor Yellow
} else {
    Write-Host "`n" 
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta
    Write-Host "2️⃣  Module B: Talep Tahmini" -ForegroundColor Magenta
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta

    $demand_script = "$PROJECT_ROOT\notebooks\module_b_demand\train_demand_model.py"
    if (Test-Path $demand_script) {
        try {
            Write-Host "⏳ Eğitim başlatılıyor..." -ForegroundColor Cyan
            python "$demand_script"
            
            $model_file = "$model_dir\demand_model.pkl"
            if (Test-Path $model_file) {
                $size = (Get-Item $model_file).Length / 1MB
                Write-Host "✅ Demand modeli başarıyla eğitildi" -ForegroundColor Green
                Write-Host "   📁 $model_file ($("{0:F2}" -f $size) MB)" -ForegroundColor Green
            }
        } catch {
            Write-Host "❌ Demand modeli eğitimi başarısız oldu:" -ForegroundColor Red
            Write-Host $_.Exception.Message -ForegroundColor Red
        }
    } else {
        Write-Host "❌ Training script bulunamadı: $demand_script" -ForegroundColor Red
    }
}

# Module C: Fraud
Write-Host "`n" 
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta
Write-Host "3️⃣  Module C: Sahte Sipariş Tespiti" -ForegroundColor Magenta
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta

$fraud_script = "$PROJECT_ROOT\notebooks\module_c_fraud\train_fraud_model.py"
if (Test-Path $fraud_script) {
    try {
        Write-Host "⏳ Eğitim başlatılıyor..." -ForegroundColor Cyan
        python "$fraud_script"
        
        $model_file = "$model_dir\fraud_model.pkl"
        if (Test-Path $model_file) {
            $size = (Get-Item $model_file).Length / 1MB
            Write-Host "✅ Fraud modeli başarıyla eğitildi" -ForegroundColor Green
            Write-Host "   📁 $model_file ($("{0:F2}" -f $size) MB)" -ForegroundColor Green
        }
    } catch {
        Write-Host "❌ Fraud modeli eğitimi başarısız oldu:" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
    }
} else {
    Write-Host "❌ Training script bulunamadı: $fraud_script" -ForegroundColor Red
}

# ============================================================
# ÖZET
# ============================================================
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✨ ÖZET" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

$models = @(
    "logistics_model.pkl",
    "demand_model.pkl",
    "fraud_model.pkl"
)

$all_trained = $true
foreach ($model in $models) {
    $model_path = "$model_dir\$model"
    if (Test-Path $model_path) {
        Write-Host "✅ $model" -ForegroundColor Green
    } else {
        Write-Host "❌ $model (eksik)" -ForegroundColor Red
        $all_trained = $false
    }
}

if ($all_trained) {
    Write-Host "`n🎉 Tüm modeller başarıyla eğitildi!" -ForegroundColor Green
    Write-Host "Backend uygulaması artık bu modelleri kullanabilir." -ForegroundColor Green
} else {
    Write-Host "`n⚠️ Bazı modeller eğitilemedim. Yukarıdaki hatalarını kontrol edin." -ForegroundColor Yellow
}

Write-Host "`n📂 Model dizini: $model_dir" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
