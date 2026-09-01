@echo off
cd /d "%~dp0"
git add -A
git commit -m "fix: period cancel — await Supabase + revert local state + toast error on fail"
git push
echo Done!
pause
