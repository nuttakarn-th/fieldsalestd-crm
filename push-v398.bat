@echo off
cd /d "%~dp0"
git add src/pages/StrengthsPage.tsx src/pages/StrengthsReportGenerator.ts src/pages/StrengthsTeamGridPage.tsx src/pages/StrengthsAdminPage.tsx src/App.tsx src/config/roleMenus.ts src/pages/MarketingPortal.tsx
git commit -m "feat: Strengths Finder v398 — CliftonStrengths quiz + Gallup PDF + Team Grid

- StrengthsPage.tsx: Quiz 68 คู่ A/B + ผลลัพธ์ Top 5 พร้อม insights & แนวทางพัฒนา (ไม่มี Sales Tip)
- 34 Themes list แสดง descriptionTH ใต้ชื่อแต่ละ theme
- StrengthsReportGenerator.ts: export LONG_DESC + PDF 2 ฉบับ (Gallup style)
- StrengthsTeamGridPage.tsx: Grid 34 themes × ทุก member (Marketing Manager only)
- roleMenus.ts: marketingManagerMenu แยกจาก marketingMenu + Team Strengths Grid
- Route: /marketing/strengths + /marketing/strengths/team"
git push
pause
