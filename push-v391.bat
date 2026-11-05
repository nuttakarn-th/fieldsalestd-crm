@echo off
cd /d "%~dp0"
git add src/store/marketingPlanStore.ts src/pages/MarketingPlanPage.tsx src/App.tsx src/pages/MarketingLayout.tsx
git commit -m "feat: Marketing Plan 2570 — Gantt + CRUD + Supabase (v391)

- สร้างตาราง marketing_plan_items ใน Supabase พร้อม seed data 30+ items
- สร้าง marketingPlanStore.ts: fetchAll/create/update/delete/updateStatus/updateActual
- สร้าง MarketingPlanPage.tsx: Gantt Timeline, 3-level hierarchy, Filter, Status badges
- เพิ่ม route /marketing/plan + sidebar REPORTS section"
git push
pause
