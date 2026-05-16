@echo off
chcp 65001 >nul
title Field Sale CRM - Git Setup
cd /d "%~dp0"

echo.
echo ============================================================
echo   Setting up Git repo (one-time)
echo ============================================================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Git not installed.
  echo.
  echo Please install Git for Windows from:
  echo   https://git-scm.com/download/win
  echo.
  echo Use default options when installing.
  pause
  exit /b 1
)

git --version

REM Clean up any partial .git folder from previous attempts
if exist ".git" (
  echo Removing existing .git folder...
  rmdir /s /q ".git"
)

git init
git config user.email "nuttakarn.th90@gmail.com"
git config user.name "Nuttakarn"
git branch -M main

git add .
git commit -m "Initial commit - Lovable export + Supabase scaffolding"

echo.
echo ============================================================
echo   Done!  Local git ready.
echo.
echo   Next: push to GitHub for backup
echo     1. Create empty repo at https://github.com/new
echo        (private, do NOT initialize with README)
echo     2. Copy the 2 commands GitHub shows under
echo        "push an existing repository"
echo     3. Paste here in the same terminal
echo ============================================================
pause
