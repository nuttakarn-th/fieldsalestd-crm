@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git commit -m "feat: flipbook deep-link fix, customers date+sort, phone dup block, returning customer autocomplete"
git push
pause
