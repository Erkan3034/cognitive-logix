param()

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $Root "backend"
$EnvExample = Join-Path $BackendDir "env.example"
$EnvFile = Join-Path $BackendDir ".env"
$FrontendDist = Join-Path $Root "frontend\dist"
$FrontendIndex = Join-Path $FrontendDist "index.html"
$ModelDir = Join-Path $BackendDir "trained_models"
$RequiredModels = @(
    (Join-Path $ModelDir "logistics_model.pkl"),
    (Join-Path $ModelDir "fraud_model.pkl"),
    (Join-Path $ModelDir "demand_model.pkl")
)

if (-not (Test-Path $EnvFile)) {
    if (-not (Test-Path $EnvExample)) {
        throw "backend\env.example not found."
    }
    Copy-Item $EnvExample $EnvFile
}

if (-not (Test-Path $FrontendIndex)) {
    throw "frontend\dist\index.html not found. Run the frontend build before packaging."
}

$missingModels = @()
foreach ($modelPath in $RequiredModels) {
    if (-not (Test-Path $modelPath)) {
        $missingModels += $modelPath
    }
}

if ($missingModels.Count -gt 0) {
    $message = $missingModels -join "`n"
    throw "Missing trained model artifacts:`n$message"
}

$Python = (Get-Command python -ErrorAction Stop).Source
$BackendArgs = @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000")

Start-Process -FilePath $Python -ArgumentList $BackendArgs -WorkingDirectory $BackendDir | Out-Null

for ($i = 0; $i -lt 60; $i++) {
    try {
        Invoke-WebRequest -Uri "http://127.0.0.1:8000/health" -UseBasicParsing | Out-Null
        break
    }
    catch {
        Start-Sleep -Seconds 2
    }
}

Start-Process "http://127.0.0.1:8000/" | Out-Null
