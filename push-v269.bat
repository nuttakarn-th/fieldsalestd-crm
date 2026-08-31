@echo off
cd /d "%~dp0"
git add -A
git commit -m "feat: add LIVE SALES section with War Room link in MarketingLayout sidebar"
git push
echo Done!
pause
