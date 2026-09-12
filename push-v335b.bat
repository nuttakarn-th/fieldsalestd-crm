@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "fix: OTACalendar JPG export — add branded header (OTA/Calendar/date) + orders/pax summary + remove today highlight in export"
git push
pause
