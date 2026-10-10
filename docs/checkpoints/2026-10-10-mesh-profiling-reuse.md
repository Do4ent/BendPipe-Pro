# PERF-001 — DWFx mesh profiling and reuse, 2026-10-10

## Implemented
- Added runtime diagnostic `TubeBenderReferenceSceneUi.performanceStats()` with `templateBuilds`, `templateCacheHits`, cumulative and maximum template creation durations in milliseconds, and bounded list of up to 20 slow templates (threshold: 16 ms).
- Existing DWFx shared Three.js mesh template cache is retained. Profiling confirms whether unchanged source assets reuse the cached template when only tube parameters change; no recomputation of geometry is necessary on template cache hit.
- Regression test renders the same DWFx asset twice with a tube parameter mutation between calls and asserts one template build and at least one cache hit.
- CI feature branch trigger added.

## Important boundary
The pre-existing template cache avoided duplicate BufferGeometry construction already, so this tranche instruments and verifies it; it does not eliminate the entire top-level scene traversal, cloned Group creation, or repaint cost. Rendering of edited tube geometry still happens by the legacy path and is not suppressed. A future change should avoid full reference-tree traversal for pure tube edits using explicit versioned source/runtime dependencies and a safe lifetime policy for shared Three.js objects.

Not yet benchmarked in real Chromium. No formal acceptance and no main merge.
