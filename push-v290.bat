@echo off
cd /d "%~dp0"
git add -A
git commit -m "feat: PublicCatalog v4 — hero strip, friendly labels, advanced filter toggle, footer CTA"
git push
echo Done!
pause
