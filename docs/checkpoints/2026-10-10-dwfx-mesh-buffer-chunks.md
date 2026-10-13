# PERF-001 DWFx large mesh buffer chunking — 2026-10-10

Changed actual `buildAssetTemplate` path to consume typed arrays prepared cooperatively by `render3DCooperative`. Prior to building Three.js geometry, vertex/triangle index arrays are copied in bounded 2048-item slices through scheduled tasks. Fully prepared typed buffers are cached per source mesh in a WeakMap for reuse by both transparent and opaque templates. Cancellation prevents stale cooperative scene commits; only fully prepared buffers enter cache.

Added regression test with a 5000-vertex/4998-face mesh that requires several scheduled passes and asserts copied buffer contents. Existing no-asset branch tests remain unchanged. Standalone builder already invokes `render3DCooperative` through PR #10.

**Limitations:** `BufferGeometry.computeVertexNormals()`, GPU uploads, and individual source mesh traversal remain synchronous. Prepass enumerates runtime assets and can prepare unreferenced meshes. No measured performance acceptance and no release merge; keep draft until tests complete.
