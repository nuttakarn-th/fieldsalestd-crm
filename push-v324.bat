@echo off
chcp 65001 >nul
cd /d "D:\Cowork_All\CRM Project\fieldsale-crm-main"

if exist ".git\HEAD.lock"  del /f ".git\HEAD.lock"
if exist ".git\index.lock" del /f ".git\index.lock"

echo === Staging files (v323 + v324) ===
git add src/components/AppLayout.tsx
git add src/pages/Customers.tsx
git add src/pages/Pipeline.tsx
git add src/pages/Hub.tsx
git add src/config/roleMenus.ts
git add src/pages/MarketingLayout.tsx
git add src/lib/activityLog.ts
git add src/components/ActivityFeed.tsx
git add src/store/campaignStore.ts
git add src/pages/CampaignManagement.tsx

git commit -m "feat: v323+v324 - OB Manager filter + Marketing data separation (Phase 1-5)"

echo.
echo === Pushing ===
git push
echo.
git log --oneline -5
echo.
echo === Summary ===
echo  Phase 1: badge [OB]/[Sales] บน customer row (Marketing view)
echo  Phase 2: Marketing sidebar แยก OUTBOUND LEADS / SALES LEADS sections
echo  Phase 3: Customer list tab toggle [ทั้งหมด] / [OB] / [Sales] สำหรับ Marketing
echo  Phase 4: ActivityFeed dept badge + filter tabs [ทั้งหมด]/[OB]/[Sales]
echo  Phase 5: Campaign target_team field (OB / Sales / ทั้งคู่)
echo  v323:    OB Manager เห็น OB pool เท่านั้น + null currentRep guard
echo.
echo  Supabase: activity_log.department column (already applied)
echo.
echo DONE
pause
