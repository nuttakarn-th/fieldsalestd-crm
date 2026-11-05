@echo off
cd /d "%~dp0"
git add src/pages/MarketingPlanPage.tsx
git commit -m "fix: Marketing Plan — แก้ปุ่ม edit/delete เด้งไปมาเวลา hover (v392)

- เปลี่ยน hidden/table-cell toggle → opacity-0/opacity-100 transition
- ปุ่มอยู่ใน DOM ตลอด ไม่ทำ layout shift → ไม่เด้งอีก
- เพิ่ม column header + empty td ให้ครบทุก row (table structure สมบูรณ์)"
git push
pause
