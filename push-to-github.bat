@echo off
chcp 65001 >nul
title Field Sale CRM - Push to GitHub
cd /d "%~dp0"

echo.
echo ============================================================
echo   Pushing to GitHub:  nuttakarn-th/fieldsalestd-crm
echo ============================================================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Git not installed.
  pause
  exit /b 1
)

if not exist ".git" (
  echo [ERROR] Local git repo not initialized.
  echo   Run  git-setup.bat  first.
  pause
  exit /b 1
)

REM Add remote (skip if already exists)
git remote remove origin 2>nul
git remote add origin https://github.com/nuttakarn-th/fieldsalestd-crm.git
if errorlevel 1 (
  echo [ERROR] Failed to add remote.
  pause
  exit /b 1
)

git branch -M main

echo.
echo Pushing to GitHub...
echo.
echo If asked to login:
echo   - A browser window will open
echo   - Sign in to your GitHub account
echo   - Grant access to "Git Credential Manager"
echo.

git push -u origin main
if errorlevel 1 (
  echo.
  echo [ERROR] Push failed - see error above
  echo.
  echo Common fixes:
  echo   1. Login to GitHub when browser opens
  echo   2. Make sure repo at github.com/nuttakarn-th/fieldsalestd-crm exists
  echo   3. Make sure repo is empty ^(no README/gitignore initialized^)
  pause
  exit /b 1
)

echo.
echo ============================================================
echo   Pushed successfully!
echo   View your code at:
echo   https://github.com/nuttakarn-th/fieldsalestd-crm
echo ============================================================
pause
