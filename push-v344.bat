@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "fix: Remove auto-sync local->Supabase push — was causing duplicate orders (203) when multiple machines had stale localStorage; Supabase is now the single source of truth; loadFromSupabase is pure pull only"
git push
pause
