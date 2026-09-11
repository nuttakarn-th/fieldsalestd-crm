@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "feat: Vehicle Summary in Operations tab — join rules (CMP+CMS, CML+CMD, sub-itinerary), capacity rules (1-13→1Van, 14-26→2Van, >26→1Bus), table by usage_date + KPI Vehicles Used"
git push
pause
