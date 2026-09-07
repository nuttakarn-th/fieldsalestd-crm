@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git commit -m "fix: TripManifest — leadsSelect + fallback filter by program+travel_month for old leads"
git push
pause
