@echo off
cd /d "%~dp0"
git add src/pages/ota/OTAOrderEntry.tsx
git commit -m "feat: OTA Nationality free-text input v397

- SearchCombobox: เพิ่ม allowFreeText prop
- เมื่อพิมพ์แล้วไม่มีในรายการ → แสดงปุ่ม '+ ใช้ [ข้อความ]'
- Nationality field ใน Add/Edit Order ใช้ allowFreeText
- รองรับ Laos, Myanmar และสัญชาติอื่นๆ ที่ไม่อยู่ใน preset list"
git push
pause
