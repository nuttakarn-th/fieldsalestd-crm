@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "fix: Survey B2C result — แนะนำโปรแกรม match Persona + fix LINE URL

SurveyB2C.tsx:
  - LINE URL: https://lin.ee/your-line-id → https://line.me/R/ti/p/@standardtour
  - personaDescriptions: เพิ่ม 'สายหัวคณะ' (จัดกรุ๊ปเพื่อน ราคาพิเศษหัวคณะ)

  Tour loading (loadTours + toTourItems):
    - รับ personaTag? เป็น argument
    - 1st pass: filter .contains('persona_targets', [personaTag])
      ถ้าได้ result → setToursMatched(true), แสดงหัว '🎯 โปรแกรมที่ตรงกับสไตล์ {persona}'
    - fallback: ดึงทัวร์ทั่วไป limit 5, setToursMatched(false)
      แสดงหัว '🗓️ โปรแกรมทัวร์ที่เปิดให้บริการอยู่ตอนนี้'
    - useEffect เรียก loadTours() (ไม่มี tag) ตอน mount เหมือนเดิม
    - handleSubmit: เรียก loadTours(tag) หลัง infer persona

  State ใหม่:
    - toursMatched: boolean (toggle heading)"
git push
pause
