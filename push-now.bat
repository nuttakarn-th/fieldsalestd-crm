@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
git add -A
git commit -m "fix: adjustPeriodQuota async + rollback + toast — CancelBookingDialog v2 — highlight + ยอดซื้อ"
git push
pause
