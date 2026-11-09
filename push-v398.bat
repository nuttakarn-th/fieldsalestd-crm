@echo off
cd /d "%~dp0"
git add src/pages/StrengthsPage.tsx src/App.tsx src/config/roleMenus.ts src/pages/MarketingPortal.tsx
git commit -m "feat: Strengths Finder page v398 — CliftonStrengths quiz

- StrengthsPage.tsx: Quiz 68 คู่ A/B อิง Gallup 34 Themes
- รายงาน Top 5 พร้อม Sales Tip + Domain Breakdown chart
- ขยายดูได้ครบทั้ง 34 Themes พร้อม ranking
- บันทึกผลใน localStorage ต่อ user
- Route: /marketing/strengths (Marketing role เท่านั้น)
- Marketing Hub bottom bar: link Strengths ✨
- Sidebar: Marketing role เท่านั้น"
git push
pause
