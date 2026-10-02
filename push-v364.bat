@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "feat: Persona page — 6 Persona Cards + Survey Dashboard tabs

- สร้าง PersonaPage.tsx ที่ /marketing/persona
  - Tab 1: Persona Cards ทั้ง 6 กลุ่ม (B2C 4 + B2B 2)
    - Card แสดง: emoji, ชื่อ, อายุ, อาชีพ, งบ, ช่องทาง, quote
    - คลิกเปิด Detail Modal: พฤติกรรม, motivation, pain points
    - Filter: ทั้งหมด / B2C / B2B
  - Tab 2: Survey Dashboard (embed PersonaSurveyDashboard)
- MarketingLayout.tsx sidebar: เปลี่ยน Persona Survey → Persona
- roleMenus.ts: เปลี่ยน Persona Survey → Persona (/marketing/persona)
- App.tsx: เพิ่ม route /marketing/persona"
git push
pause
