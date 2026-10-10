# TubeBender — 120 functional requirement acceptance

This branch introduces a traceable acceptance register, not a claim that 120 requirements are complete.

- Primary source: consolidated TubeBender technical specification 2.1 dated 2026-10-10.
- Functional requirement groups: 120 identifiers (SCOPE through PERF).
- ACC (12) and AT (15) acceptance IDs are intentionally not counted among the 120.
- `acceptance/requirements-120.mjs` is the executable ID register.
- Browser cases are explicitly tagged `[ID]` and run with real Chromium against a freshly built standalone artifact.
- A browser case covers the **whole** requirement only if `BROWSER_COVERAGE` labels it `complete`. Partial cases are evidence, not a passed requirement.
- `node scripts/acceptance-120-report.mjs` outputs one row for **every** ID in `reports/acceptance/requirements.csv` and JSON.
- Possible statuses: `BROWSER_PASSED`, `PARTIAL_EVIDENCE`, `FAILED`, `NOT_EXECUTED`, `NOT_AUTOMATED`. Lack of automation is never reported as passing.
- After build: `npm install --no-save @playwright/test@1.56.1 && npx playwright install chromium && npx playwright test --config acceptance/playwright.config.mjs`.
- GitHub Actions saves JSON, CSV, screenshot and trace artifacts for each run.

**Limitations:** this is the first browser-automation tranche; most requirements still need dedicated behavioral assertions and independent golden/reference acceptance. Passing a browser smoke test does not imply full program release readiness. Keep `main` untouched.
