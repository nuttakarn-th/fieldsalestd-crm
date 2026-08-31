@echo off
cd /d "%~dp0"
git add -A
git commit -m "fix: MarketingDashboard revenue from activity_log (matches War Room)"
git push
echo Done!
pause
