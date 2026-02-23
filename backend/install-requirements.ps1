# Backend bağımlılıklarını kurma scripti
# Python 3.13 için önceden derlenmiş wheel'leri zorla

Write-Host "Installing backend dependencies..." -ForegroundColor Green

# Önce temel paketleri kur (NumPy olmadan)
Write-Host "`nStep 1: Installing core packages..." -ForegroundColor Yellow
pip install fastapi==0.115.8 uvicorn[standard]==0.30.6 pydantic==2.10.6 python-multipart==0.0.9

# NumPy'yi önceden derlenmiş wheel ile kurmayı dene
Write-Host "`nStep 2: Installing NumPy (pre-built wheel)..." -ForegroundColor Yellow
pip install --only-binary :all: "numpy>=1.24.0,<2.0.0" || pip install numpy

# Diğer paketleri kur
Write-Host "`nStep 3: Installing ML packages..." -ForegroundColor Yellow
pip install pandas==2.2.3 scikit-learn==1.5.2 joblib==1.4.2

# Opsiyonel paketler (hata verirse atla)
Write-Host "`nStep 4: Installing optional packages..." -ForegroundColor Yellow
pip install xgboost==2.1.3 || Write-Host "  Warning: xgboost installation failed, skipping..." -ForegroundColor Yellow
pip install prophet==1.1.5 || Write-Host "  Warning: prophet installation failed, skipping..." -ForegroundColor Yellow

Write-Host "`n✅ Installation complete!" -ForegroundColor Green
