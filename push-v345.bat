@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "fix: Import parseNum helper — strips currency symbols (฿$€£¥) and commas before parseFloat so cells formatted as text '฿2,012.50' or '20.00%%' import correctly instead of 0"
git push
pause
