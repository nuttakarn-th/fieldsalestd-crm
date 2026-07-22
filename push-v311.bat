@echo off
chcp 65001 >nul
cd /d "D:\Cowork_All\CRM Project\fieldsale-crm-main"

if exist ".git\HEAD.lock"  del /f ".git\HEAD.lock"
if exist ".git\index.lock" del /f ".git\index.lock"

echo === Staging files ===
git add src/components/NavActions.tsx
git add src/pages/Hub.tsx
git add src/components/StandaloneHeader.tsx

git commit -m "fix: v311 - replace TeamNotifications with ActivityFeed in NavActions, Hub, StandaloneHeader"

echo.
echo === Pushing ===
git push --force-with-lease
echo.
git log --oneline -5
echo.
echo DONE
pause
