@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "feat: Persona Card — แยก Cover + Profile Photo, Avatar centered

Supabase:
  - ALTER TABLE persona_profiles ADD COLUMN cover_url TEXT

PersonaProfile interface:
  - เพิ่ม cover_url?: string

PersonaCard (new layout):
  - Cover banner 88px: ถ้ามี cover_url → object-cover, ถ้าไม่มี → gradient
  - Badge pin top-left บน cover
  - Avatar วงกลม 72px centered ยื่นออก -bottom-9 (ไม่ใช้รูปซ้ำบน cover)
    ถ้ามี image_url → รูปคน, ถ้าไม่มี → emoji บน gradient
  - ชื่อ + อายุ/อาชีพ → center ใต้ avatar
  - Stats grid line-clamp-2 (แก้ค่าที่ยาวเกินขึ้น 3 บรรทัด)
  - Channel chips → justify-center

EditModal — Photo section (แยก 2 ส่วน):
  - 👤 รูปโปรไฟล์ (image_url): preview วงกลม 64px
    upload → persona-images/{id}.{ext}
  - 🖼️ ภาพ Cover (cover_url): preview banner 96×56px
    preview แสดง gradient+emoji ถ้ายังไม่มีรูป
    upload → persona-images/{id}-cover.{ext}
  - แต่ละส่วนมีปุ่มลบแยก
  - state: uploadingProfile, uploadingCover, imgPreview, coverPreview
  - ref: fileInputRef, coverInputRef
  - helper: uploadToStorage() รวม logic upload+getPublicUrl"
git push
pause
