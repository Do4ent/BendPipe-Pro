# PERF-001: progressive DWFx WebGL scene uploads — 2026-10-10

Development only (no formal acceptance). Based on feature/perf-normals-upload-20261010.

## Implementation
- Cooperative DWFx builder adds `progressive` opt-in and `onProgress` callback. Finished batches are attached to a staging Three.js Group before a repaint while future branches remain pending.
- Standalone viewport enables progressive mode (8 root subtrees per batch). A `requestAnimationFrame` boundary and task hop precedes each subsequent batch, allowing the previous batch to paint and triggering deferred GPU buffer creation at the first WebGL draw.
- WebGL redraw occurs after intermediate batches and at final commit, without calling full CAD model rebuild.
- A newer scene build cancels the previous build and removes its partial staging group when still active.
- Existing default non-progressive behavior stays atomic for API consumers.
- Tests cover multi-batch visibility and removal of stale partial geometry; builder wiring test added.

## Limits / correctness risks
- This distributes *first draw* GPU buffer uploads across frames when each batch has independently drawable meshes; it is not a low-level partial GPU buffer transfer and a single exceptionally large mesh can still block a frame.
- Partial scene visibility is intentional when `progressive:true`. Quality verification is required for selected helpers, tree transforms, and project switching in Chromium.
- No latency measurements or browser acceptance yet. No changes to canonical geometry or compensation. Main untouched.
