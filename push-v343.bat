@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "feat: Import upsert — Template/Export/Import share same 16-col format; re-import exported file updates existing orders (price/comm/discount) instead of skipping as duplicates; preview shows blue update tab with before/after price; result modal shows inserted+updated+failed"
git push
pause
