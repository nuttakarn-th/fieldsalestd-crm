@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "feat: Survey B2C v2 — 5 คำถามใหม่ + Scoring Matrix + สายมือใหม่

surveyStore.ts:
  - เพิ่ม B2CPersona 'สายมือใหม่' พร้อม COLORS, EMOJI, QUICK_INFO
  - เพิ่ม q5 ใน SurveyResponse interface
  - แทนที่ inferPersonaB2C(q1-q4) if-else → scoring matrix:
      Q1 region / Q2 style / Q3 days / Q4 budget / Q5 pain × 6 personas
      travel_experience bonus: first_time→สายมือใหม่+10, 4plus→สายหัวคณะ+8
  - ageGroupFromQ4 deprecated (Q4 ตอนนี้คือ budget)

SurveyB2C.tsx:
  - เปลี่ยน 4 คำถามเก่า → 5 คำถามใหม่:
      Q1 โซนปลายทาง (เอเชีย/อาเซียน/ยุโรป/ในประเทศ)
      Q2 สไตล์ (ธรรมชาติ/ชิล/กิจกรรม/กิน-วัฒนธรรม)
      Q3 จำนวนวัน (3-4/5-6/7+)
      Q4 งบประมาณ (<25k/25-45k/45-65k/65k+)
      Q5 Pain point (ตารางแน่น/ซ้ำซาก/อาหาร-ที่พัก/วันไม่ตรง)
  - handleSubmit: ส่ง q5 + travelExp ให้ inferPersonaB2C
  - เพิ่ม description สายมือใหม่ ใน thank-you page
  - ลบ ageGroup logic ออก

Supabase: เพิ่ม q5 INTEGER column ใน survey_responses (via MCP)"
git push
pause
