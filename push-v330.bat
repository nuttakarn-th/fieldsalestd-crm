@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "feat: OTA Report page 2 — Commission by Platform table, Top Pickup Hotels ranking, Monthly Comparison 6-month table; OTADashboard passes topPickupHotels to export"
git push
pause
