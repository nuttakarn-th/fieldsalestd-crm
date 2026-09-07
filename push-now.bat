@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
git add -A
git commit -m "fix: highlight re-fires on nav + ยอดซื้อ จาก BookingLeadDialog + stock quota period edit"
git push
pause
