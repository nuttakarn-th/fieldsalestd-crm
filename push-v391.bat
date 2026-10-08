@echo off
cd /d "%~dp0"
git add src/pages/StockAnalytics.tsx
git commit -m "feat: เพิ่ม Cancellation Analytics Tab ใน Stock Analytics (v391)

Tab ใหม่ '❌ Cancellation' ประกอบด้วย:
  - KPI: period ยกเลิก / Cancellation Rate / Revenue หาย / วันเฉลี่ยที่แจ้งยกเลิก
  - เหตุผลการยกเลิก (bar chart) — ใช้ CANCEL_REASONS constants
  - Timeline: ยกเลิกกี่วันก่อนเดินทาง (≤7 / 8-14 / 15-30 / 31-60 / >60 วัน)
  - รายเดือน trend bar chart
  - Top 10 โปรแกรม cancel rate สูงสุด + แนะนำ
  - Log period ที่ยกเลิกล่าสุด 20 รายการ + เหตุผล + ผู้ยกเลิก"
git push
echo.
echo === v391 pushed ===
pause
