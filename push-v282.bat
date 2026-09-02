@echo off
cd /d "%~dp0"
git add -A
git commit -m "feat: auto realtime sync — tours global subscription, bookings channel, tab visibility refetch, conflict toast"
git push
echo Done!
pause
