@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "feat: Profile photo crop dialog — ลาก + ซูมก่อนอัปโหลด

PersonaPage.tsx:
  - ImageCropDialog component ใหม่:
      วงกลม 240px preview, drag to pan, scroll/slider to zoom (1x-5x)
      onConfirm: canvas.drawImage crop area → toBlob(jpeg,0.92) → upload
      onCancel: revokeObjectURL + ปิด
  - handleImageSelect(): intercept file input → open crop dialog (ไม่อัปโหลดตรง)
  - handleCropConfirm(): รับ blob จาก crop → upload เป็น .jpg → setImgPreview
  - Touch support: single-finger drag + pinch-to-zoom
  - Crop math: baseScale = cover viewport, translate offset → natural image coords"
git push
pause
