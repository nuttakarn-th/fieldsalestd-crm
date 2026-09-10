@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git commit -m "feat: split-pane blog layout + inline lead edit (no tabs, no page nav)"
git push
pause
