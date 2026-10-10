# PERF-001 / PERF-003 browser evidence checkpoint — 2026-10-10

Base: `feature/perf-dwfx-crossmodule-audit-20261010`; main unchanged.

## Added
- `tests/browser/perf-001-redraw-timing.spec.mjs` captures five Chromium redraw request-to-observed-completion durations and renderer/frame queue telemetry in a Playwright JSON attachment.
- The measurement invokes real standalone `TubeBenderEngineering.renderAll()` and waits until the exposed renderer counters advance, refusing failed draws.
- Existing `perf-001-003.yml` now also runs for this branch, including the existing PERF-003 startup/binding browser test.

## Evidence boundary
- This is **not** parameter-edit-to-paint. Timing includes browser automation polling and does not establish responsiveness on a representative large DWFx project.
- No fault was injected in the real browser into an optional module here; PERF-003 still has direct unit fault-injection and existing browser startup binding assertions.
- No acceptance claim until CI finishes and representative-project latency and optional-module browser fault injection are established.
