@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "feat: Persona Dashboard — RFM x Persona table + Source Channel breakdown

- PersonaSurveyDashboard: เพิ่ม JSX section สำหรับ RFM x Persona
  - ตาราง: ลูกค้า / Leads / จอง / Conversion% / Avg Deal / Total Revenue
  - เรียงตาม Total Revenue (สูงสุดก่อน)
  - แสดงเฉพาะ persona ที่มีลูกค้าจริงใน CRM
- เพิ่ม Source Channel breakdown section (chip cards)
  - ดึงจาก survey_responses.source_channel
  - แสดงเฉพาะเมื่อมีข้อมูล
- SurveyB2C + SurveyB2B: contact form มี source_channel + travel_experience fields
- surveyStore: interface รองรับ source_channel + travel_experience
- Supabase migration: เพิ่ม column source_channel + travel_experience แล้ว"
git push
pause
