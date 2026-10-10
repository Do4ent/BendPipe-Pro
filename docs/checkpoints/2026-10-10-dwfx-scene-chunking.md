# DWFx cooperative geometry construction — 2026-10-10

Implemented a real rendering-path opt-in API `TubeBenderReferenceSceneUi.render3DCooperative`. It calls existing `renderSceneTree` for batches of individual top-level DWFx subtrees, rather than batching no-op metadata. The staged THREE.Group is attached atomically when construction completes, so partial geometry is not exposed. Replacement of the project invalidates previous pending work, and explicit cancel prevents stale commits. All scene data retains the same normalization and geometry creation functions as synchronous `render3D`.

Tests include actual execution of the reference-scene code against a minimal THREE group implementation, atomic multi-tick commit, and cancellation upon superseding project.

**Integration boundary:** the existing legacy caller still invokes synchronous `render3D`; the new cooperative entry point is real but opt-in. Consumer must pass a redraw callback through `onCommit` for the completed group to become visible in the WebGL canvas. No automatic migration or real performance improvement is claimed. Individual extremely large subtree/mesh may still block one batch. Next migration must update the host renderViewerOnly call and implement incremental mesh subdivision where required. No acceptance, no main merge.
