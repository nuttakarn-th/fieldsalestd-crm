@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "feat: add Persona Survey to Admin menu + fix Marketing/OB menus in roleMenus.ts

- Admin menu: เพิ่ม MARKETING TOOLS section พร้อม Persona Survey link
- Marketing/OB Manager/OB Coordinator: Persona Survey อยู่ใน menu แล้ว (push-v357)
- roleMenus.ts full sync เพื่อให้ sidebar แสดงถูกต้องบน production"
git push
pause
