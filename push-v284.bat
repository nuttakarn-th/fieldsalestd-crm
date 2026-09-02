@echo off
cd /d "%~dp0"
git add -A
git commit -m "feat: show Period travel_date in OB Leads history + fix AllService TDZ white screen"
git push
echo Done!
pause
