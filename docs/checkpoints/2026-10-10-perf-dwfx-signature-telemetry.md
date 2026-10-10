# PERF-001 DWFx signature profiling — 2026-10-10

## Source inspection
`referenceSignature(project,geomScale)` serializes the conservative source state on each cooperative render request. This includes reference-scenes metadata and can become an expensive main-thread operation. It currently protects correctness for legacy writers which do not bump all revision counters.

## Changes
- Added `signatureCalls`, `signatureTimeMs`, `lastSignatureTimeMs`, `maxSignatureTimeMs`, and `lastSignatureBytes` to `sceneReuseStats()`.
- Timed and counted the existing conservative `JSON.stringify` path without altering its key or cache invalidation.
- Added a regression test demonstrating that ordinary tube length edits still reuse reference geometry and that signature statistics are populated.

## Acceptance
This is instrumentation, **not** proof of the bottleneck or an O(1) replacement. The serialized signature remains intentionally conservative until all external writers are audited. No passing CI result or representative-DWFx latency is claimed. main remains unchanged.
