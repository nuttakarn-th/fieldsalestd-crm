@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "fix: Mobile P&L profit pill — show full number (฿3,000) instead of short format (฿3k)"
git push
pause
