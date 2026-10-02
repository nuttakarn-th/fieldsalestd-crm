@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "feat: Persona Deep Insight fields + Program Tagging ready

Supabase persona_profiles:
  - ADD COLUMN decision_trigger TEXT
  - ADD COLUMN booking_lead_time TEXT
  - ADD COLUMN content_formats TEXT[]
  - ADD COLUMN price_sensitivity TEXT
  - UPDATE seed data ทั้ง 6 persona ด้วยข้อมูล marketing insight

PersonaPage.tsx:
  - PersonaProfile interface: เพิ่ม 4 fields ใหม่
  - Detail Modal: เพิ่ม section 'Deep Insight'
    - Decision Trigger (highlight สีน้ำเงิน)
    - Booking Lead Time
    - Price Sensitivity
    - Content Formats (tags)
  - EditModal: เพิ่ม section 'Deep Insight' ด้านล่าง
    - input fields ครบทั้ง 4
    - content_formats ใช้ TagInput component

Program Tagging (tours.persona_targets):
  - พบว่า AllService.tsx มี UI อยู่แล้ว (line 3808)
  - tours table มี persona_targets ARRAY อยู่แล้ว
  - ระบบ ready ใช้งานได้เลย"
git push
pause
