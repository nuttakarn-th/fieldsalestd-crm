@echo off
cd /d "%~dp0"
git add src/store/serviceStore.ts src/pages/AllService.tsx
git commit -m "feat: Sync Quota v395 — แก้ quota desync อัตโนมัติ

- serviceStore: เพิ่ม syncAllQuotas() — query leads+bookings จาก Supabase
  คำนวณ quota จริง แล้ว patch ทุก period ที่ desync ใน batch เดียว
- AllService: เพิ่มปุ่ม Sync Quota ใน toolbar (เฉพาะ canEdit)
  กดแล้ว toast บอก: แก้ N period / ถูกต้องทั้งหมดแล้ว / error

แก้ root cause: cancel+book พร้อมกัน / แก้ DB ตรง / network error
ทำให้ quota != actual booked seats"
git push
pause
