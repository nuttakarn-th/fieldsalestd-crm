@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "feat: Gross Price auto-calc from Package platform_prices x PAX — no extra input field; triggers on Package/Platform/PAX change; shows unit price hint; manual override still works"
git push
pause
