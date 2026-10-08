@echo off
cd /d "%~dp0"
git add src/pages/StockAnalytics.tsx
git commit -m "fix: Cancellation — เปลี่ยนกลับเป็น total_seats - quota แทนการ load จาก bookings table (v394)

ใช้ค่าเดียวกับที่ UI หน้าหลักแสดง (จอง X/Y)
ถ้ายอดผิดพลาด = ข้อมูลที่คนลงไม่ถูกต้อง ไม่ใช่ bug ระบบ
ลด complexity: ไม่ต้อง useEffect + Supabase query เพิ่ม"
git push
echo.
echo === v394 pushed ===
pause
