@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "feat: เพิ่ม Persona สายหัวคณะ (Senior Group Leader)

Supabase persona_profiles:
  - INSERT id=senior, tag=สายหัวคณะ, emoji=👑, type=b2c, sort_order=5
  - ข้อมูลครบ: travel_with, frequency, budget, channels, motivations, pain_points
  - Deep Insight: decision_trigger, booking_lead_time, content_formats, price_sensitivity
  - ปรับ sort_order: B2C 1-5, B2B 6-7

surveyStore.ts:
  - B2CPersona type: เพิ่ม 'สายหัวคณะ'
  - PERSONA_COLORS/EMOJI/ALL_PERSONAS/QUICK_INFO: เพิ่มครบ
  - inferPersonaB2C: เพิ่ม rule 'q4===5 AND q2===2 → สายหัวคณะ'
    (อายุ 56+ เดินทางกับกลุ่มเพื่อน → Senior Group Leader)
  - ageGroupFromQ4: เพิ่ม q4===5 → 'Senior'
  - inferPersonaFromCustomer: เพิ่ม auto-detect
    (closedLeads >= 4 trips + avgPax >= 4 + price < 15K → สายหัวคณะ)

สิ่งที่ยังไม่ได้ทำ (manual step):
  - Survey form (B2C Q4) ควรเพิ่ม option '56 ปีขึ้นไป' เป็น option 5
    เพื่อให้ inferPersonaB2C จับ q4===5 ได้จริง"
git push
pause
