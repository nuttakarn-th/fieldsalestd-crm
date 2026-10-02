@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "feat: Persona Card Redesign + Photo Upload

PersonaCard (redesign):
  - Cover 108px: ถ้ามีรูป → full-bleed object-cover
    ถ้าไม่มี → emoji ขนาด 48px กลาง gradient
  - Dark gradient overlay เสมอ (text readability)
  - Badge pin มุมซ้ายบน (ออกจาก header ไม่ทับรูป)
  - Edit button มุมขวาบน (show on hover)
  - Avatar protrudes: วงกลม 48px ยื่นออก -24px จาก header
    ถ้ามีรูป → แสดงรูป, ถ้าไม่มี → emoji บน gradient
  - Stats mini-grid 2-col: งบ/คน + เดินทางกับ
  - Channel chips: pill เล็กๆ แสดงสูงสุด 3 + count เกิน
  - Quote: line-clamp-2 + border-l primary/30

PersonaDetail modal:
  - Header: ถ้ามีรูป → แสดงวงกลม 80px + ชื่อข้างๆ
    ถ้าไม่มี → emoji 5xl เหมือนเดิม

EditModal — Photo Upload section:
  - Preview วงกลม 80px (ImageOff icon ถ้าไม่มีรูป)
  - ปุ่มเลือกไฟล์ → upload ไป Storage persona-images/{id}.ext
  - cache-bust timestamp ต่อท้าย URL
  - ปุ่มลบรูป (แสดงเมื่อมี image_url)
  - state: uploading, imgPreview / ref: fileInputRef

Supabase (ทำไว้ก่อนหน้านี้แล้ว):
  - persona_profiles: image_url TEXT
  - Storage bucket 'persona-images': public, 5MB, jpeg/png/webp/gif
  - RLS policies: read/insert/update TO public"
git push
pause
