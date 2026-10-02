@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "fix: Share text — แสดงสถานะปิดกรุ๊ป/ยกเลิกแทนที่นั่ง 0

AllService.tsx — buildMultiShareText():
  - cancelled period → '❌ ยกเลิก' (ไม่แสดงราคา)
  - quota === 0 (เต็ม) → '🔴 ปิดกรุ๊ป'
  - ที่นั่งเหลือ ≤ 25% หรือมี special_price → 'เหลือ Q/T ที่นั่ง 🔥'
  - ปกติ → 'เหลือ Q/T ที่นั่ง'"
git push
pause
