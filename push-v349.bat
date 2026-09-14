@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "fix: P&L groupSortKey + groupDay — regex now matches any letter prefix (OA, OFG, etc.) not just OA"
git push
pause
