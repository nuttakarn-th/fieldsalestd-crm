@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "fix: Month selector changed to dropdown (19-month range) in OTAOrderEntry + OTAVehicles — replaces prev/next arrows"
git push
pause
