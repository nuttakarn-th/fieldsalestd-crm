@echo off
chcp 65001 >nul
cd /d "D:\Cowork_All\CRM Project\fieldsale-crm-main"

if exist ".git\HEAD.lock"  del /f ".git\HEAD.lock"
if exist ".git\index.lock" del /f ".git\index.lock"

echo === Staging files ===
git add src/components/AppLayout.tsx
git add src/pages/Customers.tsx
git add src/pages/Pipeline.tsx
git add src/pages/Hub.tsx

git commit -m "fix: v322 - guard null currentRep (race condition) in AppLayout + scoped filters (Customers/Pipeline/Hub)"

echo.
echo === Pushing ===
git push
echo.
git log --oneline -5
echo.
echo DONE
pause
