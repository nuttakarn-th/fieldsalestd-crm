@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "feat: OTAVehicles dedicated page + sidebar nav item — month/year picker, KPI strip (total/van/bus), join rules reminder, full table with footer"
git push
pause
