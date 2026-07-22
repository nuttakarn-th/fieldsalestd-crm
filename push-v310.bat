@echo off
chcp 65001 >nul
cd /d "D:\Cowork_All\CRM Project\fieldsale-crm-main"

if exist ".git\HEAD.lock"  del /f ".git\HEAD.lock"
if exist ".git\index.lock" del /f ".git\index.lock"

git add src/components/AppLayout.tsx

git commit -m "fix: v310 - remove duplicate TeamNotifications, keep only ActivityFeed for all roles"

echo.
echo === Pushing ===
git push --force-with-lease
echo.
git log --oneline -5
echo DONE
pause
