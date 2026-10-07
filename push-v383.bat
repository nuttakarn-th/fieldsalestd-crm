@echo off
cd /d "%~dp0"
git add src/lib/personaScorer.ts src/components/PersonaMatcher.tsx src/components/CustomerLeadDialog.tsx
git commit -m "feat: add Persona Matcher to Lead Form (v383)

- src/lib/personaScorer.ts — Score Card engine
  * Routes by buType: TRP / OB_B2C / OB_B2B / TK
  * B2B detection: company + tourType=องค์กร + pax>=20
  * OB B2C: 6 personas scored from source+pax+budget+tourType
  * OB B2B: Outing vs Seminar scored from pax+budget+company hints
  * TRP: R1–R4 scored from source+pax+company
  * Confidence 0–100 with gap-aware clamping

- src/components/PersonaMatcher.tsx — real-time panel
  * Shows top persona with emoji badge + gradient + confidence bar
  * Lists top 2 suggested next actions
  * Shows runner-up personas
  * Low-confidence warning prompts user to fill more fields

- CustomerLeadDialog.tsx — integration
  * Import PersonaMatcher
  * Render between Zone 3 (Enrichment) and Smart Status
  * Props: source, buType, pax, budget, tourType, company"
git push
echo.
echo === v383 pushed ===
pause
