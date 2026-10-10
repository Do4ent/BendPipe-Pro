# TubeBender PERF — DWFx viewport integration, 2026-10-10

The standalone builder now directs the main viewport's DWFx geometry contribution to `TubeBenderReferenceSceneUi.render3DCooperative` when available. Work is grouped in batches of eight root subtrees, with the existing synchronous `render3D` retained as compatibility fallback. The completion callback invokes the available WebGL renderer with the existing scene and camera so that committed geometry appears without triggering a second full CAD geometry rebuild.

Change preserves canonical geometry, current project controls, and machine compensation. Earlier queue logic protects against a superseding request committing obsolete geometry. Added a build-source contract test and branch CI trigger.

Limitations: this is a coarse-grained batching path. A single huge subtree may still block the UI; actual interactive latency and reference-project correctness require browser verification. The WebGL repaint is guarded by the legacy renderer/scene/camera variable availability. Formal acceptance is deferred by user request. Main remains unchanged.
