@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "fix: Date range filter — เปลี่ยนจาก overlap เป็น start_date in range

AllService.tsx — แก้ 3 จุดพร้อมกัน:
  1. filteredTours has-check (tour level)
  2. periodStats counting
  3. visiblePeriods render (period row level)

Bug:
  Logic เดิมใช้ overlap:
    end >= filterDateFrom AND start <= filterDateTo
  ทำให้ period ที่ span ยาว เช่น '1 ก.ย. 69 – 31 ต.ค. 70'
  ผ่าน filter ทุก range ที่อยู่ใน span นั้น

Fix: เปลี่ยนเป็น start_date in range:
    start >= filterDateFrom AND start <= filterDateTo
  → แสดงเฉพาะ period ที่ 'เริ่มเดินทาง' ในช่วงที่เลือก
  → period ยาว Sep 2026 – Oct 2027 จะไม่โผล่ตอนเลือก Dec–Jan

Applies to:
  - filteredTours: if (filterDateFrom && start < filterDateFrom) return false
  - periodStats:   เงื่อนไขเดียวกัน
  - visiblePeriods (render): เงื่อนไขเดียวกัน"
git push
pause
