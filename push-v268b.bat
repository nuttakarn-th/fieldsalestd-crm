@echo off
cd /d "%~dp0"
git add -A
git commit -m "fix: SalesWarRoom chart — bucket byDate using local TZ (en-CA) ป้องกัน UTC shift"
git push
echo Done!
pause
