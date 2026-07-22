@echo off
chcp 65001 >nul
cd /d "D:\Cowork_All\CRM Project\fieldsale-crm-main"

if exist ".git\HEAD.lock"  del /f ".git\HEAD.lock"
if exist ".git\index.lock" del /f ".git\index.lock"

git add src/components/AppLayout.tsx
git add src/pages/MarketingLayout.tsx
git add src/lib/activityLog.ts
git add src/store/serviceStore.ts
git add src/components/ActivityFeed.tsx

git commit -m "feat: v305 - ActivityFeed + StandyBtn all layouts + period_nearly_full threshold alert"

echo.
echo === Pushing ===
git push --force-with-lease
echo.
git log --oneline -5
echo DONE
pause
