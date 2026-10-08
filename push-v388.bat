@echo off
cd /d "%~dp0"
git add src/pages/StockAnalytics.tsx
git commit -m "feat: เพิ่ม Program Ranking Tab ใน Stock Analytics (v388)

Tab ใหม่ '🏆 Program Ranking' แสดง:
  - Top 10 โปรแกรมศักยภาพสูง (แนะนำเพิ่ม Period)
  - Bottom 10 โปรแกรมศักยภาพต่ำ (แนะนำลด/ปรับรูปแบบ)
  - Sort by: จำนวนจอง / Booking Rate / มูลค่า
  - Filter by: ปีใดปีหนึ่ง หรือทั้งหมด
  - Summary cards: เพิ่ม Period / สถานะดี / ควรปรับแผน"
git push
echo.
echo === v388 pushed ===
pause
