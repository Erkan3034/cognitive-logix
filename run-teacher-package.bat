@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-teacher-package.ps1"
if errorlevel 1 (
  echo.
  echo Startup failed. See the PowerShell output above.
  pause
)
endlocal
