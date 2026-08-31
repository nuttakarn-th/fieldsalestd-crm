@echo off
cd /d "%~dp0"
git add -A
git commit -m "fix: MarketingDashboard — wonRevenue field + OB/target warning hints"
git push
echo Done!
pause
