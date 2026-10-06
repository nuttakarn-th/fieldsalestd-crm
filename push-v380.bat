@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "feat: Survey thank-you page — เพิ่มปุ่มดูโปรแกรมทัวร์ทั้งหมด

SurveyB2C.tsx — thank-you page:
  - เพิ่มปุ่ม 'ดูโปรแกรมทัวร์ทั้งหมด' (indigo) ต่อจากปุ่ม LINE
  - ลิงก์ไป standardtour-hub.vercel.app/tour-packages
  - แสดงทุกครั้งหลัง submit ไม่ว่าจะมีหรือไม่มีทัวร์ match"
git push
pause
