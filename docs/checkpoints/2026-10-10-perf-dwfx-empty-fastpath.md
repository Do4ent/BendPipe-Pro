# PERF-001 — empty DWFx reference fast path (2026-10-10)

## Change
When a project has neither referenceScenes nor editable_mesh_instances, referenceSignature returns a constant empty-scene token instead of mapping all imported-source metadata on tubes and serializing it. This avoids a linear walk through the tube list for empty-reference projects.

- Counts fast-path calls in sceneReuseStats().emptyFastPaths.
- If a reference scene or editable mesh instance appears, normal conservative JSON signature checking resumes automatically, producing a cache miss and a proper scene build.
- Regression test uses 10,000 tubes and verifies two fast-path checks, zero serialized signatures, cache reuse, and invalidation after adding a scene.

## Scope and limits
This is specifically for projects without reference geometry. Projects containing DWFx still use the conservative signature to detect uninstrumented legacy writers; revision-only detection remains unsafe until the writer audit is complete. No geometry recognition, machine compensation, or main changes. CI and browser acceptance are not yet confirmed.
