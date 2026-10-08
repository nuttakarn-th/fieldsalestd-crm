@echo off
cd /d "%~dp0"
git add src/pages/StockAnalytics.tsx
git commit -m "fix: Program Ranking — Period Count นับทุก period รวม archived + past (v390)

แยก logic 2 ชุด:
  - Period ทั้งหมด = นับทุก period ที่เคยสร้าง (archived + past + active)
    ยกเว้นเฉพาะ cancelled และ !start_date
  - จอง / ที่นั่ง / Rate / มูลค่า = คำนวณเฉพาะ period ที่ไม่ได้ cancelled
Column header เปลี่ยนเป็น 'Period ทั้งหมด' พร้อม tooltip อธิบาย"
git push
echo.
echo === v390 pushed ===
pause
