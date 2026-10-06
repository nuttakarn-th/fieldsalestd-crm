@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "feat: BookingLeadDialog — duplicate booking guard

เพิ่ม duplicate check ก่อน insert lead ใหม่:
  - ตรวจ leads ใน store ว่ามี period_id เดียวกัน + phone/customer_id ซ้ำมั้ย
  - ถ้าเจอ: แสดง warning banner สีส้ม (ไม่ insert ทันที)
    'วราภรณ์ มีการจองรอบนี้แล้ว 2 ที่นั่ง ต้องการเพิ่มรายการใหม่?'
  - ปุ่ม 'ยืนยัน — เพิ่มรายการใหม่': bypass check และ auto-submit
  - ปุ่ม 'ยกเลิก': กลับไปแก้ form ได้ตามปกติ
  - รายการที่ status=ยกเลิก ไม่นับเป็น duplicate
  - reset dupWarning + bypassDupCheck เมื่อ dialog ปิด"
git push
pause
