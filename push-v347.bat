@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "ui: Swap Package Code above Number of People in Add Order form — Package Code/Platform row first, then People/Package Details row"
git push
pause
