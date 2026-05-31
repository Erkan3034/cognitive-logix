param(
    [string]$OutputRoot = "teacher_package"
)

$ErrorActionPreference = "Stop"

$SourceRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$StageRoot = Join-Path $SourceRoot $OutputRoot
$ZipPath = Join-Path $SourceRoot "$OutputRoot.zip"

if (Test-Path $StageRoot) {
    Remove-Item $StageRoot -Recurse -Force
}
if (Test-Path $ZipPath) {
    Remove-Item $ZipPath -Force
}

New-Item -ItemType Directory -Path $StageRoot | Out-Null
New-Item -ItemType Directory -Path (Join-Path $StageRoot "backend") | Out-Null
New-Item -ItemType Directory -Path (Join-Path $StageRoot "data") | Out-Null
New-Item -ItemType Directory -Path (Join-Path $StageRoot "data\processed") | Out-Null
New-Item -ItemType Directory -Path (Join-Path $StageRoot "frontend") | Out-Null

Copy-Item (Join-Path $SourceRoot "backend\app") -Destination (Join-Path $StageRoot "backend\app") -Recurse
Copy-Item (Join-Path $SourceRoot "backend\requirements.txt") -Destination (Join-Path $StageRoot "backend\requirements.txt")
Copy-Item (Join-Path $SourceRoot "backend\env.example") -Destination (Join-Path $StageRoot "backend\env.example")
Copy-Item (Join-Path $SourceRoot "backend\trained_models") -Destination (Join-Path $StageRoot "backend\trained_models") -Recurse

Copy-Item (Join-Path $SourceRoot "data\temiz_veri_final_latest.csv") -Destination (Join-Path $StageRoot "data\temiz_veri_final_latest.csv")
Copy-Item (Join-Path $SourceRoot "data\processed\analiz_veri.csv") -Destination (Join-Path $StageRoot "data\processed\analiz_veri.csv")
Copy-Item (Join-Path $SourceRoot "frontend\dist") -Destination (Join-Path $StageRoot "frontend\dist") -Recurse

Copy-Item (Join-Path $SourceRoot "run-teacher-package.ps1") -Destination (Join-Path $StageRoot "run-teacher-package.ps1")
Copy-Item (Join-Path $SourceRoot "run-teacher-package.bat") -Destination (Join-Path $StageRoot "run-teacher-package.bat")
Copy-Item (Join-Path $SourceRoot "README.md") -Destination (Join-Path $StageRoot "README.md")

Compress-Archive -Path (Join-Path $StageRoot "*") -DestinationPath $ZipPath -Force

Write-Host "Package staged at: $StageRoot"
Write-Host "Zip created at:    $ZipPath"
