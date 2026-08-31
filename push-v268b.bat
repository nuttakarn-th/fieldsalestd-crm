@echo off
cd /d "%~dp0"
git add -A
git commit -m "fix: SalesWarRoom chart — Thai UTC+7 fixed offset for date/hour bucketing"
git push
echo Done!
pause
