# PERF-001 startup main-thread diagnostic checkpoint — 2026-10-10

## Motivation
Earlier headless Chromium startup checks timed out while the main thread was busy. Existing redraw telemetry does not distinguish that startup bottleneck from viewport rendering.

## Change
Added `tests/browser/perf-001-startup-longtasks.spec.mjs`:
- registers a buffered Chromium Long Tasks PerformanceObserver before document scripts execute;
- collects task start/duration, count, maximum and sum;
- records boot phase status and any navigation error;
- attaches JSON diagnostic evidence even on failed boot polls, where page evaluation remains responsive;
- fails if boot cannot be confirmed.

The existing PERF browser CI grep selects this test without changes to geometry or production code.

## Acceptance boundary
Long Task entries (>=50 ms) help identify main-thread stalls but do not prove end-user edit-to-paint responsiveness. Representative DWFx project measurements and confirmed green CI are still outstanding. main not modified.
