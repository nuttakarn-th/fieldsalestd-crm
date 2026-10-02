@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "fix: Persona menu OB Manager/Admin — ใช้ /app/persona แทน /marketing/persona-survey

App.tsx:
  - เพิ่ม route /app/persona ใต้ AppLayout
    (ทำให้ OB Manager เห็น Persona page ภายใต้ sidebar ของตัวเอง ไม่ใช่ MarketingLayout)

roleMenus.ts:
  - OB Co-ordinator: Persona Survey /marketing/persona-survey → Persona /app/persona
  - OB Manager:      Persona Survey /marketing/persona-survey → Persona /app/persona
  - Admin MARKETING TOOLS: Persona Survey → Persona /app/persona

Result:
  - OB Manager กด Persona → เห็น PersonaPage (Cards + Survey tabs) ใน OB sidebar
  - ไม่ถูก redirect ไป MarketingLayout อีกต่อไป"
git push
pause
