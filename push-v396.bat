@echo off
cd /d "%~dp0"
git add src/store/crmStore.ts src/pages/MarketingOBLeads.tsx
git commit -m "fix: CRM data reliability v396

1. limit(500) → limit(2000): ป้องกัน customer/lead หายเมื่อ DB เกิน 500 rows
2. isLoading state: spinner + loading indicator ขณะ Supabase กำลัง fetch
3. Supabase Realtime: subscribe customers+leads — auto-reload เมื่อ user อื่น INSERT/UPDATE/DELETE
4. channel override fix: OB staff สร้าง customer ผ่าน admin ได้ channel=OB ถูกต้อง
5. OBLeads UI: ปุ่ม Refresh + spinner + dot indicator Realtime status"
git push
pause
