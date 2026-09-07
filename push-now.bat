@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git commit -m "fix: og-page preserve ?pkg= param in redirect so deep-link flipbook works"
git push
pause
