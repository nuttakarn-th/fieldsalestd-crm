@echo off
cd /d "%~dp0"
git add src/pages/StrengthsPage.tsx src/App.tsx src/config/roleMenus.ts
git commit -m "feat: Strengths Finder page v398 — CliftonStrengths quiz

- StrengthsPage.tsx: Quiz 68 คู่ A/B อิง Gallup 34 Themes
- รายงาน Top 5 พร้อม Sales Tip + Domain Breakdown chart
- ขยายดูได้ครบทั้ง 34 Themes พร้อม ranking
- บันทึกผลใน localStorage ต่อ user
- Route: /marketing/strengths
- Sidebar: Marketing, Sales, OB Coordinator, Admin"
git push
pause
