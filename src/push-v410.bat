@echo off
chcp 65001 >nul
cd /d "D:\Cowork_All\CRM Project\fieldsale-crm-main"
if exist ".git\HEAD.lock"  del /f ".git\HEAD.lock"
if exist ".git\index.lock" del /f ".git\index.lock"

REM ── v410: OTA Pickup Hotel — เลือกจากรายชื่อกลาง + Dashboard ข้ามตัวเลือกพิเศษ ──
git add src/pages/ota/PickupHotelCombobox.tsx
git add src/pages/ota/OTAOrderEntry.tsx
git add src/pages/ota/OTADashboard.tsx

REM ── แจ้งเตือนกิจกรรม: แสดงเวลา ──
git add src/components/ActivityFeed.tsx
git add src/components/OTANotificationBell.tsx

REM ── รวม v409 เผื่อยังไม่ได้ push ──
git add src/components/PeriodLastChange.tsx
git add src/pages/AllService.tsx

git commit -m "feat: v410 - OTA pickup hotel combobox (master list + fuzzy search) + dashboard excludes special options"

echo.
echo === Pushing ===
git push --force-with-lease
echo.
git log --oneline -5
echo DONE
pause
