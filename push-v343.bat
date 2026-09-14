@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "fix: Import Template exampleRow — add missing financial columns (Gross Price / Comm% / CommAmt / Discount / NetRevenue) so imported orders show correct amounts instead of 0"
git push
pause
