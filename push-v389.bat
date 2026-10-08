@echo off
cd /d "%~dp0"
git add src/pages/StockAnalytics.tsx
git commit -m "fix: Program Ranking แสดงชื่อโปรแกรม (title) แทน tour code (v389)

- Title row: tourTitle (t.title || t.city || t.code)
- Subtitle row: tourCode · country"
git push
echo.
echo === v389 pushed ===
pause
