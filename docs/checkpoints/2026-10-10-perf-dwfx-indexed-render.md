# PERF-001 — DWFx indexed render + first-reuse fix (2026-10-10)

## Actual changes
- `src/import/dwfx/reference-scene-ui.js` now builds per-scene indexes for linked editable tubes, detached-source lookup, editable mesh instances, selected tube/mesh IDs, editable part numbers and selection keys. Cooperative rendering retains each index across its root-node tasks. Synchronous rendering also uses the indexed path.
- Existing first-match ordering, detached-link semantics and mesh-instance order are preserved.
- Crucially, lazily loaded DWFx runtimes are registered **before** the render cache signature is recorded. Previously runtime registration bumped geometry revision *after* the signature, causing a needless miss after the initial scene build.
- The conservative JSON signature remains unchanged: a legacy direct source-link mutation still triggers a cache miss even if no revision counter advances.
- New focused regression `tests/core/perf-dwfx-source-index.test.mjs` checks a 600-tube / 48-root synthetic project, one index build for cooperative roots, immediate reuse after tube length edit, and invalidation after a direct source-link visibility change. It also verifies first-match and mesh selection semantics.
- The PERF CI workflow syntax-checks and runs that focused test before the general regression suite.

## Isolated runtime verification
Executed the **actual fetched JavaScript module** in a controlled V8 harness with mock THREE groups. On a synthetic 500-tube / 40-root / 160-node scene, one-pass results were:
- Before indexed rendering: 341,822 reads of `currentProjectImport`; ~31 ms.
- With indexed rendering: 3,003 reads; ~4 ms.
- Both completed 40 roots without renderer failures.

These measurements are **single-pass mock benchmarks**, not a production WebGL or representative DWFx benchmark. Timing is environment-dependent; the reduced property-read count is the more reliable indication of eliminated repeated work.

The initial-reuse defect was independently reproduced: before the pre-registration fix, the first tube-only edit missed the completed scene cache; after the fix it returned `reused:true`. Direct source-link display changes still invalidate reuse.

## Status
GitHub commits exist in the PR #24 head branch; no confirmed passing GitHub Actions or Playwright result for this head. Do not claim PERF-001/003 accepted. Main unchanged.
