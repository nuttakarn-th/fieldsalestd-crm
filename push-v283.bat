@echo off
cd /d "%~dp0"
git add -A
git commit -m "fix: AllService white screen — move pOpen state before conflict-detection useEffect (TDZ bug)"
git push
echo Done!
pause
