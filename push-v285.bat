@echo off
cd /d "%~dp0"
git add -A
git commit -m "feat: add PromoReadyNotification — 31-180 days + fill rate < 70% (blue badge)"
git push
echo Done!
pause
