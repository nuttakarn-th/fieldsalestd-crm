@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git status
git commit -m "feat: Persona Survey System (All 4 Phases) + Bug Fixes

Bug Fixes:
- Fix double seat release on cancel booking (skipQuotaAdjust flag)
- Fix booked customers disappear on total_seats edit (computeEditQuota)
- Archive/History section visible to Admin role only

Persona Survey System:
- Public survey pages /survey/b2c and /survey/b2b (no login required)
- B2C: 4 personas (สายคุ้มค่า/ธรรมชาติ/กิจกรรม/ชิลล์พรีเมียม)
- B2B: 2 personas (Outing B2B / Seminar B2B)
- Card-tap UI, auto-advance, Thank You page with LINE link
- Auto-tag customer persona by phone match from survey
- Persona fields + auto-infer button in EditCustomerDialog
- Persona Target multi-select chips in AllService tour form
- PersonaSurveyDashboard at /marketing/persona-survey
- Menu items for Marketing / OB Manager / OB Coordinator
- Routes: /survey/b2c and /survey/b2b (public, no auth)
- surveyStore.ts: inferPersonaB2C / inferPersonaB2B / inferPersonaFromCustomer"
git push
pause
