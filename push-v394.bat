@echo off
cd /d "%~dp0"
git add src/pages/MarketingPlanPage.tsx
git commit -m "feat: Marketing Plan v394 — Detail Drawer (คลิกแถวดูรายละเอียด)

- เพิ่ม DetailDrawer component: slide-in panel จากขวา เหมือน HTML เดิม
- คลิก L3 row ทุกที่ (ชื่อ, Gantt bar, ทั้งแถว) เปิด drawer
- Drawer แสดง: ชื่อ, side, dept tags, status, งบแผน/จริง, KPI, คำอธิบาย, owner, notes, monthly bar chart
- ปุ่ม แก้ไข ใน drawer เปิด edit modal ต่อได้เลย
- กด Escape หรือคลิก overlay เพื่อปิด"
git push
pause
