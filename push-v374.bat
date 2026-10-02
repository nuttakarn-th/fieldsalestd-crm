@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "fix: Date range filter — ซ่อนโปรแกรมที่ไม่มี period ในช่วงเวลาที่เลือก

AllService.tsx — filteredTours (date range check):

Bug 1: guard `if (periods.length > 0)` ทำให้ tour ที่มี 0 period
  ผ่าน filter ได้เสมอ → โผล่ '0 Period' ทั้งที่ไม่ควรแสดง
  Fix: ลบ guard ออก — has=false เมื่อ periods.length===0 → filtered out

Bug 2: `has` check นับ cancelled/archived periods เป็น match ได้
  → tour โผล่มาเพราะ cancelled period อยู่ใน range
    ทั้งที่ visible period ว่างเปล่า
  Fix: เพิ่ม early-return ก่อน date check:
    if (!effectiveShowCancelled && p.cancelled) return false
    if (!effectiveShowArchived  && p.archived)  return false

Result:
  - date filter แสดงเฉพาะโปรแกรมที่มี visible period อยู่ในช่วงที่เลือก
  - '0 Period' ไม่โผล่มาอีกต่อไปเมื่อ filter active"
git push
pause
