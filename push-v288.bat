@echo off
cd /d "%~dp0"
git add -A
git commit -m "feat: PublicCatalog v2 — flat table + filters (month/seats/status/category)"
git push
echo Done!
pause
