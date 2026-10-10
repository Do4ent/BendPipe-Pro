# PERF-001 / PERF-003 — DWFx part-number cache consistency (2026-10-10)

Base: `feature/perf-dwfx-signature-telemetry-20261010`.

## Correctness gap
`editablePartSet(project)` drives suppression of recognized source components using **four** independent identifiers on each tube:
`partNumber`, `part_number`, `importEvidence.part_number`, and `currentProjectImport.part_number`.

Previously `referenceSignature(project, geomScale)` represented only the preferred `partNumber ?? part_number` and imported part number. In-place changes to `importEvidence.part_number` or `part_number` when `partNumber` existed could incorrectly reuse the previous 3D source scene.

## Change
The conservative signature now includes all four values independently. This fixes missed cache invalidation while still avoiding unnecessary rebuilds for unconnected tube length edits. Full nested DWFx JSON fallback remains active until all writes have revision tracking.

## Verification added
- VM regression checks every identifier independently and a shadowed legacy alias;
- integration regression drives `render3DCooperative` through a cache hit, in-place import-evidence change, rebuild and ordinary tube-length reuse;
- corrected legacy fallback VM test extraction to include the telemetry closure and clock function;
- branch-enabled CI performs focused tests, full `npm test`, standalone build and Chromium PERF smoke;
- `node scripts/benchmark-dwfx-signature.mjs` measures exact production signature function with synthetic workloads (100, 1000, 5000 nodes), emitting median and p95 timing as JSON, without brittle pass/fail time thresholds.

## Scope and limits
There are no actual DWFx benchmark fixtures in this repository. Synthetic timings cannot establish performance for customer projects. The conservative signature remains O(n), so no O(1) guarantee is claimed. Production acceptance depends on recorded CI/Chromium results and measured real-world files. `main` is untouched.

## Additional fix discovered by real CI
The focused cooperative-render regression exposed a second real cache defect: `render3DCooperative()` took the source signature before `runtimeForScene()` lazily registered embedded runtimes. That registration bumped the geometry revision, so the **second unchanged render missed the cache**. The implementation now hydrates visible embedded runtimes before the signature and scene-build generation are captured. The runtime preflight visits scene descriptors, not nested DWFx tree nodes. The same regression now guards first-to-second render reuse as well as alias invalidation. This section records the code fix; CI must independently confirm passing results.

## CI evidence captured
Run [38086505080](https://github.com/Do4ent/BendPipe-Pro/actions/runs/38086505080) confirmed focused DWFx cache/legacy fallback tests and synthetic benchmark steps green after the runtime-registration fix. Synthetic `referenceSignature` results from GitHub runner (40 samples each): 100 nodes median 0.049 ms / p95 0.064 ms; 1,000 nodes 0.436 / 0.923 ms; 5,000 nodes 2.897 / 3.455 ms. These are indicative synthetic-run measurements, not production CAD performance.

The same run's unfiltered `npm test` was **red**: 147,599 passed and 108 failed out of 147,707, dominated by older generated source-string contracts. It also identified brittle mesh-group-depth, malformed telemetry regex, and old synchronous render API assumptions in A25; these three test cases were updated in subsequent commits. Full-suite green status has not yet been established. Browser tests remained running at the point this checkpoint was prepared.
