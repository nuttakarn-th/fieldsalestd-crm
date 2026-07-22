@echo off
chcp 65001 >nul
cd /d "D:\Cowork_All\CRM Project\fieldsale-crm-main"

echo === Removing lock files ===
if exist ".git\HEAD.lock"  del /f ".git\HEAD.lock"
if exist ".git\index.lock" del /f ".git\index.lock"

echo === Staging fixed files ===
git add src/components/ActivityFeed.tsx
git add src/lib/excelUtils.ts
git add src/components/AppLayout.tsx
git add src/components/NavActions.tsx
git add src/components/StandaloneHeader.tsx
git add src/pages/Hub.tsx

echo === Committing ===
git commit -m "fix: v312 - ActivityFeed theme-aware (light/dark) + fix null-byte file corruption"

echo.
echo === Pushing ===
git push
echo.
git log --oneline -5
echo.
echo DONE
pause
