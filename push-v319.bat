@echo off
chcp 65001 >nul
cd /d "D:\Cowork_All\CRM Project\fieldsale-crm-main"

if exist ".git\HEAD.lock"  del /f ".git\HEAD.lock"
if exist ".git\index.lock" del /f ".git\index.lock"

echo === Staging files ===
git add src/pages/AllService.tsx

git commit -m "fix: v319 - openEdit pre-fills days/nights from period data (same logic as list display)"

echo.
echo === Pushing ===
git push
echo.
git log --oneline -5
echo.
echo DONE
pause
