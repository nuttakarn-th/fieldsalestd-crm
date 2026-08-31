@echo off
cd /d "%~dp0"
git add -A
git commit -m "feat: SalesWarRoom — chart panel (hourly/program/daily) toggle with SVG stacked bars"
git push
echo Done!
pause
