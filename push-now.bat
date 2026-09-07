@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
git add -A
git commit -m "fix: CancelBookingDialog v2 — lead-based + partial cancel + highlight + ยอดซื้อ + stock quota"
git push
pause
