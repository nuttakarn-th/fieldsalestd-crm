@echo off
cd /d "%~dp0"
git add -A
git commit -m "feat: Admin Audit Log + Restore — snapshot on all deletes + AdminAuditLog.tsx + route + menu"
git push
echo Done!
pause
