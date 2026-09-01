@echo off
cd /d "%~dp0"
git add -A
git commit -m "fix: exclude cancelled periods from tour aggregate — prevent quota>total_seats constraint violation"
git push
echo Done!
pause
