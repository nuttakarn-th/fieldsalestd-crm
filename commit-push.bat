@echo off
chcp 65001 >nul
title Field Sale CRM - Commit ^& Push
cd /d "%~dp0"

echo.
echo ============================================================
echo   Commit and push to GitHub
echo ============================================================
echo.

git status --short
echo.

set /p msg="Commit message (Enter for default): "
if "%msg%"=="" set msg=Update CRM features

git add .
git commit -m "%msg%"
rem (ถ้าไม่มีอะไร commit ก็ไม่เป็นไร — push ต่อได้เลย)

git push
if errorlevel 1 (
  echo.
  echo [ERROR] Push failed
  pause
  exit /b 1
)

echo.
echo ============================================================
echo   Pushed!  View at:
echo   https://github.com/nuttakarn-th/fieldsalestd-crm
echo ============================================================
pause
