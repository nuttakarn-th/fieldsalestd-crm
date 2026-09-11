@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "fix: OTAOrderEntry Platform/Nat/Guide filters not working — add filter states to useMemo dependency array"
git push
pause
