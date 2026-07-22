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

git commit -m "fix: v322+v323 - OB Manager filter (OB pool only, no Sales data) + null currentRep race condition guard"

echo.
echo === Pushing ===
git push
echo.
git log --oneline -5
echo.
echo === Supabase changes (already done) ===
echo  - Added OB Manager to app_role_t enum
echo  - Updated Outbound (std-011) role: OB Co-ordinator -> OB Manager
echo.
echo DONE
pause
