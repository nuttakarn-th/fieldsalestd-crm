@echo off
chcp 65001 >nul
cd /d "D:\Cowork_All\CRM Project\fieldsale-crm-main"

if exist ".git\HEAD.lock"  del /f ".git\HEAD.lock"
if exist ".git\index.lock" del /f ".git\index.lock"

git add src/lib/excelUtils.ts

git commit -m "fix: v309 - date import off-by-1 day (round to nearest UTC day instead of getDate/getUTCDate)"

echo.
echo === Pushing ===
git push --force-with-lease
echo.
git log --oneline -5
echo.
echo DONE
pause
