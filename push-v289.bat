@echo off
cd /d "%~dp0"
git add -A
git commit -m "feat: PublicCatalog v3 — accordion by program, INT/DOM sections, expand to see periods"
git push
echo Done!
pause
