@echo off
cd /d "%~dp0"
git add -A
git commit -m "fix: SalesWarRoom chart — add Others segment + full-day total label"
git push
echo Done!
pause
