@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
git add -A
git commit -m "fix: add missing app_role_t enum values + plain_password column migration (31)"
git push
pause
