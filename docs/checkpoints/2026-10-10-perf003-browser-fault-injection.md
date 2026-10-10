# PERF-003 optional picker browser fault injection — 2026-10-10

## Change
- Added opt-in `window.__TB_TEST_PERF003_FAIL_OPTIONAL__===true` guarded failure in the optional view picker initializer at standalone-build time. It does nothing during ordinary execution.
- Browser test sets the flag before any page scripts, checks the warning about `buildViewPicker`, then checks that the core `bind` startup phase succeeds and the project control / render API remain available.
- The test is selected by existing `--grep 'PERF-00[13]'` in CI. Base branch: `feature/perf-dwfx-crossmodule-audit-20261010`. main unchanged.

## Status and limitations
- Commit and test source are recorded; a passing browser run is not yet confirmed.
- The control presence and successful binding are checked, not every palette command.
- PERF-001 representative CAD model edit-to-paint acceptance is outstanding.
