@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "feat: Add price-per-person field in Order form — auto-calculates Gross Price = ราคา/คน x PAX; syncs bidirectionally with Gross Price field; updates when PAX changes"
git push
pause
