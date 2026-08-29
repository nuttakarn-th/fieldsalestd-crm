@echo off
cd /d "%~dp0"
git add -A
git commit -m "feat: CustomerLeadDialog — skipQuota checkbox ป้องกัน Stock ตัดซ้ำ"
git push
echo Done!
pause
