@echo off
cd /d "%~dp0"
git add -A
git commit -m "feat: OG tags for public pages + fix PublicCatalog anon RLS"
git push
echo Done!
pause
