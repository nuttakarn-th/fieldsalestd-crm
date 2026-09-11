@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "feat: Vehicle Join Groups — Supabase-backed CRUD (Option A) | OTAVehicles settings panel, dynamic join groups from store, OTADashboard uses dynamic vehicleJoinGroups"
git push
pause
