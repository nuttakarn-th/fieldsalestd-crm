@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "feat: Format ข้อมูล — 3-layer confirm (impact+checkbox / type-to-confirm / hold-3s) + clearAllOrders in store"
git push
pause
