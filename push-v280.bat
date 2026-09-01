@echo off
cd /d "%~dp0"
git add -A
git commit -m "fix: period edit — clamp quota to seats, await all Supabase updates, skip validation when cancelled"
git push
echo Done!
pause
