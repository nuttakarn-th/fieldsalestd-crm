@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "feat: Persona Photo — แสดงรูปบนการ์ด + modal + อัปโหลดรูปใน EditModal

PersonaPage.tsx:
  - PersonaCard header: ถ้ามี image_url แสดงรูปวงกลม w-16 + emoji badge
    ถ้าไม่มี แสดง emoji เหมือนเดิม
  - PersonaDetail modal header: ถ้ามี image_url แสดงรูป w-20 + ชื่อข้างๆ
    ถ้าไม่มี แสดง emoji ขนาดใหญ่เหมือนเดิม
  - EditModal: เพิ่มส่วน Photo Upload
    - Preview วงกลม w-20 h-20 (แสดง ImageOff icon ถ้ายังไม่มีรูป)
    - ปุ่ม 'เลือกรูปภาพ' → file input (hidden) → upload ไป Storage
    - Upload path: persona-images/{persona_id}.{ext}  upsert: true
    - หลัง upload: getPublicUrl + cache-bust timestamp → set image_url ใน form
    - ปุ่ม 'ลบรูปภาพ' (แสดงเมื่อมี image_url)
    - state: uploading (disable ปุ่มระหว่างอัปโหลด), imgPreview
    - ref: fileInputRef (useRef<HTMLInputElement>)

Supabase (ทำไว้ก่อนหน้านี้แล้ว):
  - persona_profiles: มี image_url TEXT column
  - Storage bucket 'persona-images': public, 5MB, jpeg/png/webp/gif
  - RLS policies: read/insert/update TO public"
git push
pause
