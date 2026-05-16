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
if errorlevel 1 (
  echo.
  echo Nothing to commit, or commit failed.
  pause
  exit /b 1
)

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
