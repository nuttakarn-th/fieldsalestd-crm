@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git commit -m "feat: short link + LIVE btn → Flipbook (mobile-safe); CTA overlay after close"
git push
pause
