@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "fix: restore ota-store-v4 key + auto-sync localStorage orders to Supabase on load"
git push
pause
