@echo off
cd /d "%~dp0"
git add src/pages/MarketingPlanPage.tsx
git commit -m "feat: Marketing Plan UX v393 — Sticky col + Compact filter + 3-dot menu

- Sticky first column (z-[2] + solid bg) ทุก row ล็อกชื่อกิจกรรมไว้ขณะ scroll แนวนอน
- Compact filter bar: Side toggle-group + FilterDropdown (แผนก/สถานะ) แทนปุ่ม 15+ ปุ่ม
- 3-dot menu (MoreHorizontal) แทน opacity hover buttons — ใช้ position:fixed หลีก overflow clip
- Document click handler ปิด action menu อัตโนมัติ
- Clear all filter button เมื่อมี active filter"
git push
pause
