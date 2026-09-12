@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "fix: OTACalendar — hide revenue in JPG export, PDF layout matches JPG (gradient bar + OTA header + orders/pax KPI)"
git push
pause
