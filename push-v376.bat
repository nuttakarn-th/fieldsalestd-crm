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
    source='line-share', pkgId='tour_{id}' (ตาม ShareDialog format)
  - Short link logic: ใช้ getLinksForPkg() เช็คก่อน ถ้าไม่มีค่อย createShortLink()
  - ข้อความแสดง: ชื่อโปรแกรม, วันเดินทาง, ราคา, ที่นั่งเหลือ, 🔥 ถ้า promo/nearly full
  - Dialog แสดง textarea + ปุ่ม Copy สำหรับส่งผ่าน LINE/WhatsApp

Bug fix (v376b):
  - pkgId ต้องมี prefix 'tour_' เหมือน ShareDialog
    เพื่อให้ redirect /tour-packages?pkg=tour_xxx เปิด flipbook ถูกโปรแกรม
    (packages IDs ใน TourPackagePresentation มี 'tour_' prefix เสมอ)

shortLink.ts import: เพิ่ม getLinksForPkg, createShortLink, shortUrl"
git push
pause
