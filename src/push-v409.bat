@echo off
chcp 65001 >nul
cd /d "D:\Cowork_All\CRM Project\fieldsale-crm-main"
if exist ".git\HEAD.lock"  del /f ".git\HEAD.lock"
if exist ".git\index.lock" del /f ".git\index.lock"

REM ── v408: OTA Viewer role (รวมไว้ด้วย เผื่อยังไม่ได้ push) ──
git add src/store/authStore.ts
git add src/config/roleMenus.ts
git add src/pages/Hub.tsx
git add src/components/RouteGuard.tsx
git add src/pages/ota/OTALayout.tsx
git add src/pages/ota/OTAOrderEntry.tsx
git add src/pages/ota/OTAVehicles.tsx
git add src/pages/ota/OTAPackages.tsx
git add src/pages/ota/OTAPlatforms.tsx
git add src/pages/ota/OTAContentCalendar.tsx

REM ── v409: Seat protection ──
git add src/store/serviceStore.ts
git add src/pages/AllService.tsx
git add src/pages/PeriodRoster.tsx

REM ── v409: Audit trail (ใคร/เมื่อไหร่/แก้อะไร) ──
git add src/components/AuditTrailList.tsx
git add src/pages/AuditTrailPage.tsx
git add src/App.tsx

git commit -m "fix: v409 - seat data protection + audit trail (who/when/what) + roster total fallback"

echo.
echo === Pushing ===
git push --force-with-lease
echo.
git log --oneline -5
echo DONE
pause
