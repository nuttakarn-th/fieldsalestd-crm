@echo off
chcp 65001 >nul
cd /d "D:\Cowork_All\CRM Project\fieldsale-crm-main"

if exist ".git\HEAD.lock"  del /f ".git\HEAD.lock"
if exist ".git\index.lock" del /f ".git\index.lock"

echo === Staging files (v325 - OB Dashboards) ===
git add src/pages/OBDashboard.tsx
git add src/pages/OBExecutiveDashboard.tsx
git add src/pages/ExecutiveDashboard.tsx

git commit -m "feat: v325 - OB Team Dashboard (daily 5-zone) + OB Executive Dashboard"

echo.
echo === Pushing ===
git push
echo.
git log --oneline -5
echo.
echo === Summary ===
echo  OBDashboard.tsx    : team daily view 5 zones
echo  OBExecutive.tsx    : OB Manager executive view (5 sections)
echo  ExecutiveDashboard : OB Manager role -^> OBExecutiveDashboard
echo.
echo DONE
pause
