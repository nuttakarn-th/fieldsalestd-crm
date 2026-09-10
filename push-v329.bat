@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "feat: Status filter + list row info (last contact, next followup, RFM badge) + RFM Profile card in Customers split-pane"
git push
pause
