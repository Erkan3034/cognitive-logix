# Frontend başlatma scripti
Write-Host "Starting Frontend..." -ForegroundColor Green
Set-Location frontend
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}
npm run dev
