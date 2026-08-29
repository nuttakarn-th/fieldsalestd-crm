@echo off
cd /d "%~dp0"
git add -A
git commit -m "feat: AdminAuditLog v2 — compact rows + pagination 20/50/100 + page nav"
git push
echo Done!
pause
