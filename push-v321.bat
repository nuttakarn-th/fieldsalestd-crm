@echo off
chcp 65001 >nul
cd /d "D:\Cowork_All\CRM Project\fieldsale-crm-main"

if exist ".git\HEAD.lock"  del /f ".git\HEAD.lock"
if exist ".git\index.lock" del /f ".git\index.lock"

echo === Staging files ===
git add src/pages/CustomerDetail.tsx

git commit -m "feat: v321 - customer stats 5 cards (Won trips + actual spend + active + quote pending + lost)"

echo.
echo === Pushing ===
git push
echo.
git log --oneline -5
echo.
echo DONE
pause
