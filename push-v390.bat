@echo off
cd /d "%~dp0"
git add src/store/okrFollowerStore.ts src/pages/OKRFollowerPage.tsx
git commit -m "feat: OKR Follower — ย้ายจาก localStorage → Supabase (v390)

- สร้างตาราง okr_follower_entries + okr_follower_targets ใน Supabase
- Rewrite okrFollowerStore.ts: ลบ Zustand persist (localStorage)
  เพิ่ม fetchAll() โหลดจาก Supabase, setEntry/setTargets เขียนลง Supabase
- OKRFollowerPage: useEffect fetchAll() on mount + loading/error state
- แก้ปัญหา: หน้านี้ไม่โหลดข้อมูล / ไม่บันทึกเมื่อเปิดจากเครื่องอื่น"
git push
echo.
echo === v390 pushed ===
pause
