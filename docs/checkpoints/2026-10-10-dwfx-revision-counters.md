# PERF-001 DWFx revision counters — 2026-10-10

Engineering increment, NOT acceptance.

- Introduced three independent in-memory version counters: geometry, display, and selection.
- Geometry revision increases when a reference runtime is registered/replaced.
- Selection revision increases on selection clear and bulk replacement.
- Display revision increases for source bulk show/hide/transparency commands.
- Exposed `revisionSnapshot()` and `markSceneChanged(project, kind)` for callers that mutate source geometry, presentation or selection outside this module.
- Revision snapshots are included in the conservative scene signature; explicit change events invalidate pending/cached scene work.
- Added deterministic regression tests and PERF CI branch trigger.

**Safety / pending integration:** Not every source-state mutation writer is instrumented yet (e.g. direct edits of hiddenNodeIds in standalone UI). Therefore full conservative reference-state serialization remains enabled as a correctness fallback; this increment does NOT yet make cache detection O(1). Removing fallback serialization requires auditing and adapting every writer and independently validating scene invalidation. No Chromium acceptance or main merge.
