@echo off
cd /d "%~dp0"
git add src/pages/StockAnalytics.tsx
git commit -m "fix: Program Ranking — แนะนำตาม Booking Rate จริง ไม่ใช่แค่ลำดับ (v396)

rate >= 75% → 🔥 เพิ่ม Period
rate 40-74% → ✅ สถานะดี
rate < 40%  → ⚠ ดูตลาดก่อน"
git push
echo.
echo === v396 pushed ===
pause
