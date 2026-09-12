@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "fix: OTA Calendar PDF — force print-color-adjust exact, gradient bar + purple chips now show in print"
git push
pause
