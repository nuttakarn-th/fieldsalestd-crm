@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "feat: Multi-program share — สร้างข้อความแนะนำโปรแกรมพร้อม short link

AllService.tsx:
  - เพิ่มปุ่ม '📋 สร้างข้อความแนะนำ' ใน bulk action toolbar (เมื่อเลือก Period แล้ว)
  - buildMultiShareText(): group selected periods by tour → get/create short link
    (source='line-share') → compose formatted Thai text per tour
  - Short link logic: ใช้ getLinksForPkg() เช็คก่อน ถ้าไม่มีค่อย createShortLink()
  - ข้อความแสดง: ชื่อโปรแกรม, วันเดินทาง, ราคา, ที่นั่งเหลือ, 🔥 ถ้า promo/nearly full
  - Dialog แสดง textarea + ปุ่ม Copy สำหรับส่งผ่าน LINE/WhatsApp

shortLink.ts import: เพิ่ม getLinksForPkg, createShortLink, shortUrl"
git push
pause
