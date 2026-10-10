# DWFx revision-kind source-contract reconciliation — 2026-10-10

## Input evidence
The prior full regression [GitHub Actions run 38087636295](https://github.com/Do4ent/BendPipe-Pro/actions/runs/38087636295) reported 147,602 passed / 105 failed / 147,707 total.

Seven of the failures were source-text questionnaires asserting the old form of `runSourceLinkCommand`. Earlier functionality deliberately introduced a new explicit `revisionKind` parameter.

## Changes
All seven assertions retain their original questionnaire IDs and check code that exists in `src/import/dwfx/reference-scene-ui.js`:
- UI tail: five source-link menu calls now assert the fourth argument (display for show/hide/compare; geometry for restore/break)
- Import source contract: `runSourceLinkCommand` declaration now asserts its `revisionKind="geometry"` default
- Reference scene deep contract: the same signature

No application behavior was changed, and no failing tests were disabled.

## Evidence / acceptance
Connector-read validation confirmed all 7 updated assertion strings are present in both their owning test files and the application source on branch `feature/perf-revision-contract-reconcile-20261010`.
This is **static source equivalence only**, not a successful Node/Chromium run.

The branch enables the existing PERF CI workflow; full test results for this branch remain **unverified**. Do not infer seven passing tests or a new total-failure count until CI completes. Keep [PR #34](https://github.com/Do4ent/BendPipe-Pro/pull/34) draft. Main is untouched.
