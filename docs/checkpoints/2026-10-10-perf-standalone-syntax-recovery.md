# PERF-001 / PERF-003 — Standalone startup syntax recovery (2026-10-10)

Branch: `feature/perf-browser-startup-diagnostics-20261010` (draft PR #31); base: `feature/perf-dwfx-part-identifiers-cache-20261010`.

## Confirmed failure
Chromium Actions run [38087121892](https://github.com/Do4ent/BendPipe-Pro/actions/runs/38087121892) captured `SyntaxError: Invalid or unexpected token` and `ReferenceError: tbRunIsolatedStartup is not defined`. This explained the absence of successful PERF-001/PERF-003 browser startup but did not establish the status of every optional module.

## Exact root cause
The new generated-Standalone classic-script syntax check identified script #6 at HTML line 15745. The `scripts/build-standalone.mjs` NC warning dialog generated raw line breaks inside a single-quoted JavaScript string because the builder used one layer of escaping for `\\n` sequences. The generated JavaScript therefore failed to parse; subsequent initialization was unavailable.

## Fix
Double-escape the NC dialog's newline sequences in the builder, preserving the intended dialog formatting in the generated browser JavaScript. Commit `8a71cfb43dfc90d621ecf6e9b31c848daf4ba9d4`.

## Regression protection
- `scripts/check-standalone-syntax.mjs`: parse every classic inline JavaScript script in the generated Standalone with Node's VM parser, report script number and HTML line, and require the PERF bootstrap script.
- `.github/workflows/perf-001-003.yml`: execute syntax validation after the Standalone build in both core and browser jobs, before the browser smoke test.
- Keep strict full `npm test` gating, but run and upload standalone build validation before that suite so a legacy contract failure does not hide build evidence.
- Browser diagnostics attach before navigation and capture JavaScript exceptions, console errors, failed requests, and startup state on timeout.

## Evidence and remaining gates
GitHub Actions [38087636295](https://github.com/Do4ent/BendPipe-Pro/actions/runs/38087636295) confirmed targeted PERF and DWFx tests, Standalone build, generated inline syntax validation, and generated PERF contract succeeded in the `core-perf` job. Full npm test and Chromium startup/render behavior were still running when this checkpoint was recorded; do not claim green until independently verified. Main was not modified.
