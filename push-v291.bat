@echo off
cd /d "%~dp0"
git add -A
git commit -m "feat: PublicCatalog v5 — modern card grid, urgency cues, period side drawer"
git push
echo Done!
pause
