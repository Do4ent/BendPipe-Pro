# PERF-001 / PERF-003 — DWFx signature performance telemetry (2026-10-10)

Base: `feature/perf-dwfx-inplace-fallback-regression-20261010`.

Added minimal instrumentation around the conservative `referenceSignature()` JSON serialization. `TubeBenderReferenceSceneUi.signatureStats()` now returns count, total duration, max duration and latest duration in milliseconds. The signature still serializes complete source scenes, editable mesh instances and source links, preserving detection of direct nested mutations not covered by revision notification.

A focused Node/VM test asserts the call count, nonnegative measurements and continued invalidation when a nested tree node changes.

No O(1) promise: signature remains linear in project data size. Next: benchmark representative scenes, instrument missing writers, then selectively opt in to revisions-only cache keys after proving full mutation coverage. Node/build/Chromium not executed, and main remains unchanged.
