@echo off
cd /d "%~dp0"
git add src/pages/StrengthsPage.tsx src/pages/StrengthsReportGenerator.ts src/App.tsx src/config/roleMenus.ts src/pages/MarketingPortal.tsx
git commit -m "feat: Strengths Finder page v398 — CliftonStrengths quiz + Gallup-style PDF reports

- StrengthsPage.tsx: Quiz 68 คู่ A/B อิง Gallup 34 Themes
- StrengthsReportGenerator.ts: PDF 2 ฉบับ — SF_TOP_5 (ภาพรวม visual) + Signature Theme (ฉบับละเอียด)
- Gallup domain colors: Executing #6B4E9B, Influencing #E8842A, Relationship #3CA37C, Strategic #3B73B9
- DNA strand SVG, per-theme detail pages, pairings, action tips
- บันทึกผลลัพธ์ใน Supabase (strengths_results) + localStorage backup
- Route: /marketing/strengths (Marketing role เท่านั้น)"
git push
pause
