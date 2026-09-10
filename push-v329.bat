@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "feat: RFM Profile card in Customers split-pane + fix missing leads columns (fb_name, skip_quota, department)"
git push
pause
