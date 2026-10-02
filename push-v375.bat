@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "fix: date filter — start_date in range (ตาม v374, ย้อนกลับจาก overlap revert)

กลับมาใช้ start_date in range ทั้ง 3 จุด:
  filteredTours has-check / periodStats / visiblePeriods render

Logic: แสดงเฉพาะ period ที่วันเริ่มเดินทาง (start_date) อยู่ใน range ที่เลือก"
git push
pause
