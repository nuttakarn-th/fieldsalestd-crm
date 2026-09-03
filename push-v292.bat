@echo off
cd /d "%~dp0"
git add -A
git commit -m "feat: PublicCatalog v6 — fix booking bar + destination hero header"
git push
echo Done!
pause
