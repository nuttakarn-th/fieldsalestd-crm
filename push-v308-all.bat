@echo off
chcp 65001 >nul
cd /d "D:\Cowork_All\CRM Project\fieldsale-crm-main"

if exist ".git\HEAD.lock"  del /f ".git\HEAD.lock"
if exist ".git\index.lock" del /f ".git\index.lock"

echo === Staging files ===
git add src/lib/activityLog.ts
git add src/store/serviceStore.ts
git add src/components/ActivityFeed.tsx
git add src/lib/excelUtils.ts
git add src/pages/AllService.tsx

echo === Committing ===
git commit -m "fix: v308 - period_nearly_full + timezone date bug (getUTC -> getLocal)"

echo.
echo === Pushing ===
git push --force-with-lease
echo.
git log --oneline -5
echo.
echo DONE
pause
