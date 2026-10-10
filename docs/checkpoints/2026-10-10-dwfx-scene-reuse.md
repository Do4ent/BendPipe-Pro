# PERF-001 — skip DWFx geometry reconstruction on tube-only edits (2026-10-10)

## Implementation
- Added an opt-in transparent source-state cache to the existing `render3DCooperative` main-viewport path.
- After a completed scene build, a subsequent tube-only edit can reparent the existing THREE.Group into the new viewport parent, without invoking `renderSceneTree`, re-cloning cached meshes, or resubmitting the same construction queue.
- Dependency signature includes the reference scenes, imported mesh instances, source linkage fields on tubes, reference tree selection, active object selection, and geometry scale. Tube bend lengths/angles and other regular tube-parameter values do not affect the signature.
- New diagnostic `sceneReuseStats()` reports hits/misses; regression test verifies hit after tube length edit and invalidation after hiddenNodeIds change.
- Old in-flight work is cancelled before cache reuse to protect against stale partial geometry.

## Caveats
- Current conservative signature uses JSON serialization of source state, which still walks serialized metadata. It avoids the much more expensive Three.js scene reconstruction but is not an O(1) change token. Replace it with explicit reliable source revision increments in every mutation path after confirming all writers.
- Reparenting depends on reference geometry lifecycle and must be verified under real WebGL disposal. The source THREE.Group should not be reused after GPU/geometry disposal.
- Source signatures only cover known dependencies; UI failure injection and real browser runs remain necessary. No formal acceptance, no main merge.
