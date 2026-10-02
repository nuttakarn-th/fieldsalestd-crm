@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "fix: Archive toggle — แสดงสำหรับ OB Manager ด้วย (ไม่จำกัดแค่ Admin)

AllService.tsx line 2190:
  เปลี่ยน: role === 'Admin'
  เป็น:    role === 'Admin' || role === 'OB Manager'

Root cause:
  Archive toggle button ใน stats bar ถูก guard ไว้ด้วย role === 'Admin'
  ทำให้ OB Manager เข้าหน้า AllService แล้วไม่เห็น 📦 Archive button
  ทั้งที่ archivedPeriodItems มีข้อมูลอยู่

Note:
  - Status dropdown ยังคง option '📦 Archive' สำหรับทุก role อยู่
  - Toggle button ใน stats bar เพิ่ม OB Manager แล้ว"
git push
pause
