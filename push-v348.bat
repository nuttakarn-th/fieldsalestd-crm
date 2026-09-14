@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "feat: P&L — show date from Group Code subtly; sortable headers (Date/Revenue/Profit) with asc/desc toggle; default chronological asc"
git push
pause
