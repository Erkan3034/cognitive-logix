# Backend başlatma scripti
Write-Host "Starting Backend API..." -ForegroundColor Green
Set-Location backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
