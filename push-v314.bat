@echo off
chcp 65001 >nul
cd /d "D:\Cowork_All\CRM Project\fieldsale-crm-main"

if exist ".git\HEAD.lock"  del /f ".git\HEAD.lock"
if exist ".git\index.lock" del /f ".git\index.lock"

echo === Staging files ===
git add src/store/authStore.ts
git add src/store/deleteRequestStore.ts
git add src/config/roleMenus.ts
git add src/pages/Customers.tsx
git add src/components/ActivityFeed.tsx

git commit -m "feat: v314 - add OB Manager role with separate delete approval flow"

echo.
echo === Pushing ===
git push
echo.
git log --oneline -5
echo.
echo DONE
pause
