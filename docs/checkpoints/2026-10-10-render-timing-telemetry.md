# TubeBender render timing telemetry — 2026-10-10

## Scope
Continue PERF-001 engineering without formal acceptance. Based on `feature/perf-001-003-render-startup-20261010`.

- `createFrameCoalescer` records `lastWaitMs`, `maxWaitMs`, `lastRenderMs`, and `maxRenderMs`.
- Clock can be injected, making tests deterministic.
- Existing request coalescing, latest-state behavior, cancellation, and geometry are unchanged.
- Diagnostics are observable through existing `window.TubeBenderRenderPerformance.stats`.
- Added a regression test using an injected clock, and branch-specific CI trigger.

## Outstanding work
- No formal acceptance in this step, by request.
- Browser startup checks and representative CAD edit-to-paint timing are not yet proven.
- Keep main untouched and do not merge as a release.
