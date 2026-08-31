@echo off
cd /d "%~dp0"
git add -A
git commit -m "feat: Live Sales Board opens in new tab"
git push
echo Done!
pause
