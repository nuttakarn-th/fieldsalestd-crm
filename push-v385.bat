@echo off
cd /d "%~dp0"
git add src/pages/PersonaPage.tsx
git commit -m "fix: persona card badge ชัดขึ้นบน cover image (v385)

- เปลี่ยน overlay จาก bg-black/10 → gradient from-black/40 to-transparent
- badge เปลี่ยนเป็น bg-white/90 backdrop-blur-sm text-gray-800
  → อ่านชัดทุก cover image ไม่กลืนกับพื้นหลัง"
git push
echo.
echo === v385 pushed ===
pause
