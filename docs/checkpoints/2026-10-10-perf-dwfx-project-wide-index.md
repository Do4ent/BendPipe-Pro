# PERF-001: one DWFx source index per render pass — 2026-10-10

## Changes
- `buildProjectSourceRenderIndex(project)` scans linked tubes, editable mesh instances and selection once, grouping entries by scene ID.
- `render3DCooperative` creates this index on demand and reuses it across every reference scene and root batch in the same pass.
- Synchronous `render3D` uses the same shared index. The old `buildSourceRenderIndex(project,sceneId)` adapter is retained for compatibility and tests.
- Source matching retains ordered first-link / first-nondetached-link behavior. Detached instances stay excluded; selection and part suppression use the same data as before.
- No index persists across render passes. **The conservative source-state JSON signature still detects direct legacy mutations without revision bumps.** 

## Verification
- Two additional regression scenarios in `tests/core/perf-dwfx-project-wide-index.test.mjs` verify index reuse over five scenes, 125 root nodes and 700 tubes, reuse after a regular tube length edit, invalidation after direct DWFx source-link changes, and synchronous renderer behavior.
- Both new scenarios passed in an isolated JavaScript harness evaluating the current repo source (not a full Node or WebGL run).
- Synthetic comparison, five scenes × 25 roots and 700 tubes: property getter reads reduced from **12,635 to 4,215**. Each version completed all 125 roots without reported failures. The single-pass elapsed-time samples were both around 4 ms and are **not** evidence of a speedup in Chromium.
- PERF GitHub Actions workflow was amended to check syntax and run the focused multi-scene test.

## Acceptance boundary
No confirmed green CI for this head, no representative DWFx edit-to-paint metrics, and no claim that PERF-001/003 has passed final acceptance. main unchanged; work remains in draft PR #24.
