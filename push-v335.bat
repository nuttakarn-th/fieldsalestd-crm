@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "feat: OTACalendar — show all groups (no +more), Export PDF + Save JPG buttons (revenue hidden from exports)"
git push
pause
