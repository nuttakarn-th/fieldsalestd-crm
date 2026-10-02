@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "feat: Persona Hover Tooltip บน Program Edit form

surveyStore.ts:
  - เพิ่ม PERSONA_QUICK_INFO record สำหรับทั้ง 6 persona
    Fields: who (กลุ่มเป้าหมาย/อายุ), budget, trigger (Decision Trigger), channels

AllService.tsx:
  - import PERSONA_QUICK_INFO
  - Persona Target section: wrap แต่ละ button ด้วย relative group/persona div
  - เพิ่ม hover tooltip card (absolute, bottom-full)
    - แสดงเมื่อ hover: emoji + ชื่อ, 👤 who, 💵 budget, ⚡ trigger, 📱 channels
    - CSS transition: opacity + scale, duration 150ms
    - มี arrow ชี้ลง
  - เพิ่ม hint text 'Hover เพื่อดูรายละเอียด' ใต้ label"
git push
pause
