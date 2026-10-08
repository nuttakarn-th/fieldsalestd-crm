@echo off
cd /d "%~dp0"
git add src/pages/StockAnalytics.tsx
git commit -m "feat: Cancellation log — เพิ่มคอลัมน์ 'จองก่อนยกเลิก' และ 'มูลค่าสูญเสีย' (v392)"
git push
echo.
echo === v392 pushed ===
pause
