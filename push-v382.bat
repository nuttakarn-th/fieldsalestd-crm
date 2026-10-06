@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "feat: PersonaPage — เพิ่ม TRP Persona (รถเช่าพร้อมคนขับ) 4 กลุ่ม

TRP Persona Cards (icon-based, ไม่ใช้รูปภาพ):
  - R1 ทัวร์ต่างชาติรายประจำ (TbWorld / สีน้ำเงิน)
  - R2 บริษัททัวร์คู่ค้า (TbBuildingStore / สีม่วง)
  - R3 หน่วยงานพาคณะ (TbUsersGroup / สีเขียว)
  - R4 ลูกค้าเช่าเองออนไลน์ (TbDeviceMobile / สีเทอควอยส์)

Changes:
  - เพิ่ม TrpPersonaCard component (icon square, code chip R1-R4, keywords pills)
  - เพิ่ม type: 'trp' ใน PersonaProfile interface
  - เพิ่ม TRP_ICON_MAP จาก react-icons/tb
  - เพิ่ม filter tab 'TRP — รถเช่า'
  - เพิ่ม section 'TRP — รถเช่าพร้อมคนขับ' ใน all-view
  - Header subtitle แสดงจำนวน TRP กลุ่มแบบ dynamic
  - EditModal type select รองรับ trp"
git push
pause
