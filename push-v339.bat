@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "fix: import date parser (serial/DD-MM-YYYY/MM-DD-YYYY) + validate before insert + safe package_id"
git push
pause
