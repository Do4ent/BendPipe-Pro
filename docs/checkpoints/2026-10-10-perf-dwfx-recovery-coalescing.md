# PERF-001 — coalesced stale recovery and cancellable DWFx tasks (2026-10-10)

## Problem
The DWFx `onStale` handler scheduled a new `requestAnimationFrame` for each recovery signal, even if another project render was already queued or the active project had changed. The cooperative batch adapter also scheduled work as `requestAnimationFrame(() => setTimeout(fn,0))`, but had no matching cancellation function: its default `clearTimeout` did not cancel a pending animation frame.

## Implementation
- `createSceneRecoveryCoalescer` in `src/domain/performance/render-startup.mjs` merges stale scene recoveries into at most one request per pending animation frame. Inactive project requests are rejected at scheduling time, so a late obsolete notification cannot overwrite a queued recovery for the active project. Project identity is checked again at execution time. Cancellation uses an epoch token to reject callbacks even if the host's `cancelAnimationFrame` is ineffective. Runtime errors are isolated and diagnostics are reported through `stats`.
- The standalone builder installs one shared `tbDwfSceneRecovery`, exposes read-only `window.TubeBenderDwfRecovery` diagnostics, uses `onStale:()=>tbDwfSceneRecovery.schedule(referenceProject)`, and cancels obsolete recoveries when normal 3D scene construction starts.
- `createCancellableFrameTaskScheduler` supplies a token that can cancel either the pending rAF or the pending timer stage. `render3DCooperative` now receives both `postTask` and a matching `cancelTask` adapter; an obsolete DWFx batch does not wake up after being superseded.
- The original stale-scene guard remains in place: version checks between batches, conservative signature verification before cache commit, and no stale scene commit.

## Verification
- Seven stale recovery scheduler tests, six cancellable frame/timer task tests and two render-supersession integration tests were executed with the current fetched JavaScript modules in an isolated V8 harness: **15 / 15 passed**.
- Generated performance bootstrap constructed from the actual builder source parsed successfully; neither literal backslash-n escapes nor missing recovery/task scheduler definitions were observed in the generated snippet.
- A burst of 50 stale requests produced a single queued frame. Tests also cover late out-of-order notifications from inactive projects, ineffective cancellation, scheduling failures, error containment, and normal supersession of old DWFx renders.
- Added these tests to the focused GitHub Actions workflow.

## Limitations / acceptance
The 15 V8 checks are **not** a confirmed GitHub Actions run, full `npm test` pass, or real Chromium/WebGL acceptance. Representative DWFx edit-to-paint latency remains unmeasured. These changes do not alter the approved tube geometry or bend compensation. Work stays in draft PR #24; `main` remains unchanged.
