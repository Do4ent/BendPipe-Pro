# TubeBender checkpoint — cached DWFx geometry lifetime (2026-10-10)

This development step connects the actual standalone viewer's geometry-disposal traversal to the reference-scene cache.

- Added `TubeBenderReferenceSceneUi.beforeParentDispose(root)`, which detaches the cached completed DWFx THREE.Group if it is contained in a parent scheduled for destruction.
- Hook runs immediately before the existing `root.traverse` disposal walk, preserving cached source geometry and shared GPU buffers through regular tube edits.
- Scene reuse still checks source-state signature, and replacement runtime still invalidates the scene cache.
- Added regression test verifying detach, subsequent reparent/reuse without queued reconstruction, and safe no-op for unrelated parents.
- Enabled PERF CI on this feature branch.

Caveats: comprehensive in-browser validation is pending. This stage does not yet implement O(1) revision counters, or explicit WebGL context-loss lifecycle handling. An explicit reset API already exists through `invalidateSceneCache()`. No acceptance, no merge into main.
