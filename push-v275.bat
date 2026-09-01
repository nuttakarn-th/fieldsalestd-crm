@echo off
cd /d "%~dp0"
git add -A
git commit -m "feat: AdminAuditLog — Restore button for period_cancelled events (no snapshot needed)"
git push
echo Done!
pause
