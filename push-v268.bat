@echo off
cd /d "%~dp0"
git add -A
git commit -m "feat: SalesWarRoom chart — hover tooltip + total label on bar top"
git push
echo Done!
pause
