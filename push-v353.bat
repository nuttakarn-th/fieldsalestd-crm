@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "feat: P&L desktop — Compact toggle (smaller rows, sub-text hidden to tooltip) + fixed-height scrollable tbody (max-height calc 100vh) + sticky thead"
git push
pause
