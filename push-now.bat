@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
git add -A
git commit -m "fix: stock quota — period edit form ใส่ quota field ได้โดยตรง + DB fix HQO-PEK05-CA Oct period quota=6"
git push
pause
