@echo off
cd /d "%~dp0"
git add -A
git commit -m "feat: add PublicCatalog — public read-only tour catalog page + share button"
git push
echo Done!
pause
