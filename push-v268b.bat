@echo off
cd /d "%~dp0"
git add -A
git commit -m "fix: SalesWarRoom chart — net revenue (include releases) + Thai UTC+7 date bucketing"
git push
echo Done!
pause
