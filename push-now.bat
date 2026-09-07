@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git commit -m "fix: LIVE button opens pdf_url directly + TripManifest v2 timeline redesign"
git push
pause
