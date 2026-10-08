@echo off
cd /d "%~dp0"
git add src/store/surveyStore.ts src/pages/AllService.tsx
git commit -m "feat: อัปเดต Persona Tag picker ในโปรแกรมทัวร์ → ระบบ 4+3 ใหม่ (v387)

surveyStore.ts — เพิ่ม SERVICE_PERSONA_* constants ชุดใหม่
  C1 ครอบครัว / C2a เพื่อนสายสนุก / C2b คู่รัก / C3 วัยเกษียณ
  B1 Incentive / B2 ราชการ / B3 เอเจนซี่
  (ไม่แตะ survey scoring matrix เดิม)

AllService.tsx — Persona picker ใช้ SERVICE_PERSONA_TAGS แทน ALL_PERSONAS เดิม
  แสดง emoji + label ชัดเจน พร้อม hover tooltip"
git push
echo.
echo === v387 pushed ===
pause
