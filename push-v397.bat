@echo off
cd /d "%~dp0"
git add src/pages/AllService.tsx src/pages/StockAnalytics.tsx
git commit -m "fix: ซ่อน Archive section + Activity Log สำหรับ Non-Admin (v397)

AllService.tsx:
- Archive button + คลังโปรแกรม: แสดงเฉพาะ Admin + OB Manager เท่านั้น

StockAnalytics.tsx:
- Recent Activity Log: แสดงเฉพาะ Admin เท่านั้น"
git push
echo.
echo === v397 pushed ===
pause
