@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
git add -A
git commit -m "feat: OTA import upsert — importOrders batch action + inserted/updated/errors result modal (no duplicates)"
git push
pause
