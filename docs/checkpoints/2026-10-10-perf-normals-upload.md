# PERF-001 normals / WebGL buffer optimization — 2026-10-10

- DWFx cooperative mesh prepass now accumulates triangle cross products into indexed vertex normals in slices (shared task budget 2048).
- Vertex normals are normalized in yielding slices and included alongside prepared positions and indices in WeakMap cache.
- Three.js BufferGeometry consumes the prepared `normal` attribute instead of calling synchronous `computeVertexNormals()` in the cooperative path.
- Immutable CAD position/index buffer attributes use `THREE.StaticDrawUsage` where supported, providing the appropriate GPU upload hint and avoiding dynamic-buffer semantics.
- Existing fallback path computes normals synchronously for callers that did not prepare buffers.
- Regression test checks normal attribute and buffer dimensions; branch CI trigger added.

LIMIT: StaticDrawUsage is a GPU hint only; actual GPU upload remains synchronous at first draw. True incremental GPU upload requires batching renderer submissions / separate scene commits, and still needs browser profiling. No formal acceptance or main merge.
