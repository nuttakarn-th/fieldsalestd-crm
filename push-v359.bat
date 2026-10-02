@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "fix: update B2C and B2B survey questions to match PRD + show tour programs on Thank You page

SurveyB2C.tsx:
- Q1: สไตล์การเที่ยวต่างประเทศ (FullTour/Nature/NicheActivity/Chill)
- Q2: ผู้ร่วมเดินทาง (Solo/Friends&Couple/Family)
- Q3: งบประมาณ (ประหยัด/มาตรฐาน/สายเปย์)
- Q4: ช่วงอายุ (20-25/26-35/36-45/46-55/56+)
- Thank You page: แสดงชื่อโปรแกรมทัวร์ + Period ที่เปิดอยู่

SurveyB2B.tsx:
- Q1: จุดประสงค์ (Outing/Seminar)
- Q2: บทบาท (HR/Admin, เลขา/จัดซื้อ, Executive)
- Q3: จำนวนคน (10-20/21-50/50+)
- Q4: ความท้าทาย (คุมงบ/ถูกใจคนหมู่มาก/ดูแล VIP)
- Thank You page: แสดงชื่อโปรแกรมทัวร์ + Period ที่เปิดอยู่"
git push
pause
