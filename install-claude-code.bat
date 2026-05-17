@echo off
chcp 65001 >nul
title Install Claude Code
cd /d "%~dp0"

echo.
echo ============================================================
echo   Installing Claude Code (CLI tool for AI-assisted coding)
echo ============================================================
echo.

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm not found. Install Node.js from https://nodejs.org/ first.
  pause
  exit /b 1
)

call npm install -g @anthropic-ai/claude-code
if errorlevel 1 (
  echo.
  echo [ERROR] Installation failed - see error above
  echo.
  echo If you see permission errors, try right-click this .bat
  echo and choose "Run as administrator"
  pause
  exit /b 1
)

echo.
echo ============================================================
echo   Done!  Test it:
echo     1. Close this window
echo     2. Open Command Prompt in this project folder
echo        (Shift+right-click in folder, "Open in Terminal")
echo     3. Type:  claude
echo     4. Press Enter and follow login prompt
echo ============================================================
pause
