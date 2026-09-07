@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git commit -m "fix: TripManifest — t.title/country/code for tour name + p.period_id for period match"
git push
pause
