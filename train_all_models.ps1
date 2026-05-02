# ============================================================
# Cognitive Logix - Production Model Training
# Trains all v2 production model artifacts:
#   1. Delay Risk: CatBoost + Isotonic Calibration + SHAP
#   2. Demand: LightGBM Quantile + Hierarchical Segments + Conformal Bands
#   3. Fraud: CatBoost + Calibration + IsolationForest anomaly signal
# ============================================================

param(
    [switch]$Setup = $false,
    [switch]$SkipInstall = $false
)

$ErrorActionPreference = "Stop"
$PROJECT_ROOT = $PSScriptRoot
$MODEL_DIR = Join-Path $PROJECT_ROOT "backend\trained_models"

function Write-Step($Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Assert-File($Path, $Label) {
    if (-not (Test-Path $Path)) {
        Write-Host "Missing $Label`: $Path" -ForegroundColor Red
        exit 1
    }
    Write-Host "Found $Label`: $Path" -ForegroundColor Green
}

function Invoke-Python($Arguments, $Label) {
    python @Arguments
    if ($LASTEXITCODE -ne 0) {
        Write-Host "$Label failed with exit code $LASTEXITCODE" -ForegroundColor Red
        exit $LASTEXITCODE
    }
}

function Train-Model($Name, $ScriptPath, $ArtifactPath) {
    Write-Step "Training $Name"
    Assert-File $ScriptPath "$Name training script"
    Invoke-Python @($ScriptPath) $Name

    if (-not (Test-Path $ArtifactPath)) {
        Write-Host "$Name did not create artifact: $ArtifactPath" -ForegroundColor Red
        exit 1
    }

    $sizeMb = (Get-Item $ArtifactPath).Length / 1MB
    Write-Host "$Name artifact ready: $ArtifactPath ($('{0:F2}' -f $sizeMb) MB)" -ForegroundColor Green
}

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "Cognitive Logix - Production Model Training" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan

Write-Step "Checking Python environment"
if (Test-Path "$PROJECT_ROOT\venv\Scripts\Activate.ps1") {
    & "$PROJECT_ROOT\venv\Scripts\Activate.ps1"
    Write-Host "Virtual environment activated." -ForegroundColor Green
} elseif ($Setup) {
    python -m venv "$PROJECT_ROOT\venv"
    & "$PROJECT_ROOT\venv\Scripts\Activate.ps1"
    Write-Host "Virtual environment created and activated." -ForegroundColor Green
} else {
    Write-Host "No local venv found. Using current Python interpreter." -ForegroundColor Yellow
}

if (-not $SkipInstall) {
    Write-Step "Installing production ML dependencies"
    pip install --upgrade pip
    pip install -r "$PROJECT_ROOT\requirements.txt"
}

Write-Step "Checking data files"
Assert-File "$PROJECT_ROOT\data\temiz_veri_final_latest.csv" "full cleaned dataset"
Assert-File "$PROJECT_ROOT\data\processed\analiz_veri.csv" "analysis dataset"

if (-not (Test-Path $MODEL_DIR)) {
    New-Item -ItemType Directory -Path $MODEL_DIR -Force | Out-Null
}

Train-Model `
    "Delay Risk (CatBoost calibrated)" `
    "$PROJECT_ROOT\notebooks\module_a_logistics\train_logistics_model.py" `
    "$MODEL_DIR\logistics_model.pkl"

Train-Model `
    "Demand Forecast (LightGBM quantile)" `
    "$PROJECT_ROOT\notebooks\module_b_demand\train_demand_model.py" `
    "$MODEL_DIR\demand_model.pkl"

Train-Model `
    "Fraud & Financial Risk (CatBoost + IsolationForest)" `
    "$PROJECT_ROOT\notebooks\module_c_fraud\train_fraud_model.py" `
    "$MODEL_DIR\fraud_model.pkl"

Write-Step "Validating v2 artifacts"
Push-Location "$PROJECT_ROOT\backend"
try {
    Invoke-Python @("-c", "from app.routers.metrics import get_model_health; h=get_model_health(); print([(m.name, m.status, m.model_version) for m in h.models]); assert all(m.status == 'ready' for m in h.models)") "Artifact validation"
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "All production models were trained and validated." -ForegroundColor Green
Write-Host "Model directory: $MODEL_DIR" -ForegroundColor Cyan
