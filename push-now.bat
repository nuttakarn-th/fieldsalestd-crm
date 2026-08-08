@echo off
cd /d "%~dp0"

REM ลบ lock files ถ้ามี (ป้องกัน HEAD.lock ขัด)
del /f /q ".git\HEAD.lock" 2>nul
del /f /q ".git\index.lock" 2>nul

REM Stage ทุก file ที่เปลี่ยนแปลง
git add -A

REM ถาม commit message (กด Enter เพื่อใช้ "update")
set /p MSG="Commit message (Enter = update): "
if "%MSG%"=="" set MSG=fix: OG meta — fallback to tours table so short links show program name immediately

git commit -m "%MSG%"
git push

echo.
echo Done!
pause
