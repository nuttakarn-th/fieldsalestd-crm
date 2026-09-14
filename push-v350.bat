@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "feat: P&L row-level edit mode — pencil to edit, green check to save, grey X to cancel; live preview of total cost & profit; mobile card Save/Cancel buttons; no accidental auto-save"
git push
pause
