# TubeBender checkpoint — DWFx cache lifetime (2026-10-10)

Continued PERF-001 implementation with an explicit cache invalidation boundary:
- Replacing an already registered reference-scene runtime invalidates the completed DWFx scene cache and cancels active staging.
- First-time runtime registration during initial construction does not accidentally cancel the first render.
- Exposed `TubeBenderReferenceSceneUi.invalidateSceneCache()` for callers to invalidate after renderer teardown/import changes; diagnostics now include an invalidation counter.
- Added a regression test covering cache reuse before runtime replacement and rebuilding after replacement.

No formal acceptance. The source signature still performs conservative serialization, and renderer teardown is not yet wired to the explicit invalidation hook. Browser checks and actual WebGL lifecycle validation remain outstanding. Main is unchanged.
