@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git commit -m "feat: short link → /view PDF viewer + CTA modal (Add LINE) — replace flipbook"
git push
pause
