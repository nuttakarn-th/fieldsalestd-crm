@echo off
cd /d "%~dp0"
git add -A
git commit -m "fix: MarketingDashboard — OB/Sales split by leads ratio, total from activity_log"
git push
echo Done!
pause
