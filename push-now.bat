@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
git add -A
git commit -m "fix: addUser await Supabase insert — แสดง error ถ้า DB ล้มเหลว (ไม่ fire-and-forget)"
git push
pause
