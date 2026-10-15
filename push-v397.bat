@echo off
cd /d "%~dp0"
git add src/pages/AllService.tsx
git commit -m "feat: Marketing/Marketing Manager เห็นปุ่ม Archive period ได้ (v397)

เพิ่ม role === Marketing | Marketing Manager ใน 2 จุด:
1. Archive toggle button (stats bar)
2. Archive section display (คลังโปรแกรม)"
git push
echo.
echo === v397 pushed ===
pause
