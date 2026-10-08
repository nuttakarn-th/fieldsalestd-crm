@echo off
cd /d "%~dp0"
git add src/pages/PersonaPage.tsx
git commit -m "fix: B2B persona cards — 3 columns แถวเดียว ขนาดเท่า B2C (v386)"
git push
echo.
echo === v386 pushed ===
pause
