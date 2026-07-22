@echo off
chcp 65001 >nul
cd /d "D:\Cowork_All\CRM Project\fieldsale-crm-main"

if exist ".git\HEAD.lock"  del /f ".git\HEAD.lock"
if exist ".git\index.lock" del /f ".git\index.lock"

git add src/pages/AllService.tsx

git commit -m "fix: v306 - auto-swap date range filter when from > to (AllService)"

echo.
echo === Pushing ===
git push --force-with-lease
echo.
git log --oneline -5
echo DONE
pause
