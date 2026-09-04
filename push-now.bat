@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
git add -A
git commit -m "feat: OTA full Supabase sync — ota_orders + ota_packages tables + otaStore v2 + App.tsx wire"
git push
pause
