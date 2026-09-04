@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
git add -A
git commit -m "feat: OTADashboard v2 — 4 tabs, Revenue/Ops/Markets analytics, MoM badges, RevPAX, YTD, Forecast"
git push
pause
