@echo off
cd /d "%~dp0"
git add src/pages/AllService.tsx src/pages/StockAnalytics.tsx
git commit -m "feat: Marketing role — Archive period + ซ่อน Activity Log (v397)

AllService.tsx:
- Marketing / Marketing Manager เห็นปุ่ม Archive period และคลังโปรแกรมได้

StockAnalytics.tsx:
- ซ่อน Recent Activity Log สำหรับ Marketing / Marketing Manager"
git push
echo.
echo === v397 pushed ===
pause
