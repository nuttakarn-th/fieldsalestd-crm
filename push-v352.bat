@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "feat: P&L — date shows full year (1 Sep 2026); Export XLSX with all cost columns; Import XLSX with preview+confirm modal"
git push
pause
