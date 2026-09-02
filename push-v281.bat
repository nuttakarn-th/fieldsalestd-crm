@echo off
cd /d "%~dp0"
git add -A
git commit -m "fix: war-room chart bar label — use net revenue (matches hero number)"
git push
echo Done!
pause
