# PERF-001 — Reject DWFx scene changes during cooperative rendering (2026-10-10)

## Confirmed defect
The cooperative DWFx renderer recorded a conservative source-state signature only before starting its asynchronous mesh preparation and root batches. It later committed a THREE.Group built against that old state without revalidating the project. Changes to source-link visibility, hidden reference nodes or selection between tasks could therefore enter the completed cache.

## Fix
- Take a revision-counter snapshot when creating a cooperative render request. Each scheduled task and each progressive publication boundary checks it in O(1) per version key.
- Before the **final cache commit**, recompute the complete conservative source signature. This catches legacy direct writes that do not update revision counters.
- If state changed, set `status.stale=true`, increment `sceneReuseStats().staleBuilds`, stop the task queue, detach any progressively attached staging group, and **never commit** it to the cache.
- Added optional `onStale` callback, invoked at most once per stale build. The standalone UI schedules `renderAll()` on the next animation frame only when the original project is still active.
- Explicit `markSceneChanged` / runtime invalidation now invalidates a pending handle via its `invalidate` method, also requesting recovery. A newer render superseding an old one uses normal `cancel` and does not trigger an extra retry.
- Ordinary parameter edits to tube rows do **not** force source-scene invalidation.

## Verification
Four new tests in `tests/core/perf-dwfx-inflight-mutation.test.mjs` cover:
1. A legacy source-link change after a progressive batch removes the staged scene, suppresses `onCommit`, and allows a subsequent fresh build.
2. A versioned selection edit aborts at the next task without a second expensive signature.
3. Explicit source invalidation causes exactly one recovery signal and cancels the old work.
4. An ordinary tube length edit does not invalidate immutable source geometry.

All four scenarios passed in a V8 harness executing the exact fetched module. Nine existing DWFx-related regression scenarios also passed in an isolated harness. Existing counters' expectations in three tests were updated for the new final signature check. PERF GitHub Actions now includes the new test.

## Limits
- Progressive content emitted **before** a legacy unversioned mutation may have been visible temporarily; it is detached when the final source signature detects the conflict. Versioned mutations are detected between every batch.
- The additional final conservative signature adds an O(source-state-size) check on a cache-miss build, trading some construction time for correctness. Cache hits retain their previous single-signature behavior.
- Isolated V8 results are not complete Node CI / Chromium WebGL acceptance. No representative DWFx edit-to-paint benchmark or confirmed green GitHub Actions run yet.
- Work remains on the draft PR #24 branch; `main` has not been modified.
