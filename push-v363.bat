@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "fix: add Persona Survey to MarketingLayout.tsx sidebar

- MarketingLayout.tsx มี sidebar แยกต่างหากจาก roleMenus.ts
- เพิ่ม Persona Survey ใน CAMPAIGNS section
- import Smile icon เพิ่ม
- root cause: Marketing role ใช้ MarketingLayout ที่มี custom sidebar
  ไม่ได้ใช้ AppSidebar + roleMenus.ts"
git push
pause
