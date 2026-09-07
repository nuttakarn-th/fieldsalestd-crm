@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
git add -A
git commit -m "feat: PeriodRoster page + 👥 button in AllService — adjustPeriodQuota async rollback — CancelBookingDialog v2"
git push
pause
