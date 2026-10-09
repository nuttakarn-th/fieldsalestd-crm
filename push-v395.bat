@echo off
cd /d "%~dp0"
git add src/store/surveyStore.ts src/pages/SurveyB2C.tsx src/store/serviceStore.ts src/store/crmStore.ts
git commit -m "feat: รวม Persona Survey ให้ใช้ C1/C2a/C2b/C3 เหมือน Persona Page (v395)

เปลี่ยน B2CPersona type: สาย... 6 กลุ่ม → C1/C2a/C2b/C3 4 กลุ่ม
- C1  = ครอบครัวไทยใจกว้าง (แทน สายคุ้มค่า)
- C2a = เพื่อนสายสนุก (แทน สายกิจกรรม + สายธรรมชาติ)
- C2b = คู่รัก/ทริปส่วนตัว (แทน สายชิลล์พรีเมียม)
- C3  = วัยเกษียณใจสู้ (แทน สายหัวคณะ)
- สายมือใหม่ → isFirstTime flag (travel_experience=first_time)

Rewrite scoring matrix Q1-Q5 + TRAVEL_EXP_BONUS
Update PERSONA_COLORS, PERSONA_EMOJI, PERSONA_LABELS, PERSONA_QUICK_INFO, ALL_PERSONAS
Update SurveyB2C.tsx: thank-you page แสดงชื่อ Persona ใหม่
Update inferPersonaFromCustomer → ส่งคืน C1/C2a/C2b/C3"
git push
echo.
echo === v395 pushed ===
pause
