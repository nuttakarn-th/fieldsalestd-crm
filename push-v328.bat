@echo off
cd /d "%~dp0"
if exist .git\HEAD.lock del /f .git\HEAD.lock
if exist .git\index.lock del /f .git\index.lock
git add -A
git commit -m "fix: OB role loads all leads from DB + lead reconciliation 15-min window

- Remove leadsFiltered NOT IN salesNames for OB role (was excluding OB manager's
  own leads if her name appeared in sales_reps table)
- OB role now loads all leads; customer-level scoping at app layer handles visibility
- Add lead reconciliation: re-insert local-only leads created within 15 min
  (mirrors existing customer reconciliation pattern)
- Move RECENT_MS const above both reconciliation blocks for shared use"
git push
pause
