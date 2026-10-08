@echo off
cd /d "%~dp0"
git add src/pages/StockAnalytics.tsx
git commit -m "fix: Cancellation — ดึงยอดจองจริงจาก bookings table แทน quota (v393)

Root cause: total_seats - quota ไม่ใช่ยอดจองจริง
  quota = ที่นั่งที่ allocate/ล็อกไว้ (staff กำหนดเอง)
  ยอดจองจริง = SUM(seats) จาก bookings table WHERE status != cancelled

Fix: load bookings จาก Supabase ตอน mount → Map<period_id, seats>
  แสดงผล: 'X คน (จาก bookings จริง)' หรือ '0 / ไม่มีจอง'
  Revenue lost = actual booked × price ไม่ใช่ estimate 60% อีกต่อไป"
git push
echo.
echo === v393 pushed ===
pause
