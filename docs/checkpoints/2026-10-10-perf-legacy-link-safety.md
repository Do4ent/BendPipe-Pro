# PERF-001 legacy DWFx source-link safety checkpoint — 2026-10-10

## Changes
- Removed a duplicate `emptyFastPaths` property from the scene-cache diagnostics object.
- Added `tests/core/perf-dwfx-legacy-link-fallback.test.mjs`. The test constructs a nonempty reference scene, mutates a source-link display field without calling `markSceneChanged`, and verifies that the conservative signature forces a cache miss and full rebuild, even though revision counters are unchanged.

## Why conservative checking remains required
Legacy writers may mutate `currentProjectImport.source_link` directly. Switching all nonempty DWFx scenes to O(1) revision-only detection now risks presenting stale imported geometry. Retain JSON signature fallback until the writer audit covers all project restore, source-link, and scene mutation entry points.

## Acceptance
Changes committed in PR #24 branch, main unchanged. This checkpoint provides a regression contract but not a confirmed passing browser/CI run or representative DWFx performance result.
