@echo off
cd /d "%~dp0"
git add src/pages/StrengthsPage.tsx src/App.tsx src/config/roleMenus.ts src/pages/MarketingPortal.tsx
git commit -m "feat: Strengths Finder page v398 — CliftonStrengths quiz + Supabase

- StrengthsPage.tsx: Quiz 68 คู่ A/B อิง Gallup 34 Themes
- บันทึกผลลัพธ์ใน Supabase (strengths_results) + localStorage backup
- เปิดจากเครื่องไหนก็ได้ผลเดิม (ผูกกับ user_name)
- รายงาน Top 5 พร้อม Sales Tip + Domain Breakdown chart
- ขยายดูได้ครบทั้ง 34 Themes พร้อม ranking
- Route: /marketing/strengths (Marketing role เท่านั้น)
- Marketing Hub bottom bar: link Strengths ✨"
git push
pause
