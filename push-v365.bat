@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "feat: PersonaPage — Supabase data fetch + in-app Edit UI

- PersonaPage.tsx: ดึงข้อมูล Persona จาก Supabase persona_profiles table
  - useEffect fetch ordered by sort_order
  - แทน hardcoded PERSONAS array

- Edit UI:
  - ปุ่ม pencil (✏️) บน Card header — ปรากฏเมื่อ hover
  - EditModal component: form ครบทุก field
    - ข้อมูลพื้นฐาน: emoji, tag, name, age, job, type, sort_order
    - Color picker: 8 ธีมสี (gradient + badge color)
    - พฤติกรรม: travel_with, frequency, budget, destinations
    - TagInput component: channels, motivations, pain_points
    - Quote textarea
  - บันทึกกลับ Supabase ด้วย upsert (onConflict: id)
  - Update local state ทันทีหลัง save (ไม่ต้อง reload)

- TagInput component: เพิ่ม tag ด้วย Enter หรือ + button
- ปุ่ม แก้ไข ใน Detail Modal เชื่อมกับ EditModal"
git push
pause
