@echo off
cd /d "%~dp0"
git add -A
git commit -m "fix: WarRoom dual-source merge — bookings (new) + activity_log (legacy), no double-count"
git push
echo Done!
pause
