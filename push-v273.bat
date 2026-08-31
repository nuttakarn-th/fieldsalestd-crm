@echo off
cd /d "%~dp0"
git add -A
git commit -m "fix: MarketingDashboard — add price fallback from serviceStore (match War Room)"
git push
echo Done!
pause
