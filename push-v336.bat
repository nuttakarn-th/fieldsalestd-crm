@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "feat: OTA P&L page — auto revenue from orders + inline cost input (6 categories) + green/red profit display"
git push
pause
