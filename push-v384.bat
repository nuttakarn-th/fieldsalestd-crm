@echo off
cd /d "%~dp0"
git add src/lib/personaScorer.ts src/components/PersonaMatcher.tsx src/components/CustomerLeadDialog.tsx
git commit -m "feat: Persona system 4+3 — C1/C2a/C2b/C3 + B1/B2/B3 + first_time flag (v384)

OB B2C (4 กลุ่ม):
  C1  ครอบครัวไทยใจกว้าง  👨‍👩‍👧‍👦
  C2a เพื่อนสายสนุก       🎯
  C2b คู่รัก/ทริปส่วนตัว  💑
  C3  วัยเกษียณใจสู้      🌸

OB B2B (3 กลุ่ม):
  B1  บริษัทเอกชน Incentive  🏆
  B2  ราชการ / การศึกษา      🎓
  B3  เอเจนซี่ & คู่ค้า     🤝  (กลุ่มใหม่)

TRP: R1–R4 ไม่เปลี่ยน

Flag: isFirstTime — overlay ทุก segment
  → toggle ใน Lead Form 'เคยเดินทางต่างประเทศมาก่อนมั้ย?'
  → PersonaMatcher แสดง 🌟 มือใหม่ + adjust approach hint

Supabase persona_profiles: replace 6+2 → 4+3 (TRP unchanged)"
git push
echo.
echo === v384 pushed ===
pause
