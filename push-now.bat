@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
git add -A
git commit -m "feat: OTA Platform Commission — ota_platform_configs table + OTAPlatforms page + auto-fill comm% on platform select"
git push
pause
