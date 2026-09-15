@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "feat: VehicleCalendar — purple heatmap style, VAN/BUS text (no emoji), weekend column highlight"
git push
pause
