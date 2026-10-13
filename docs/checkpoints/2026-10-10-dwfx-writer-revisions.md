# PERF-001 — DWFx mutation writer revisions (2026-10-10)

## Added
- DWFx native source-tree display mutations increment display revision: isolate, show-all, bulk visibility/transparency, scene-eye and node-eye.
- Selection changes increment selection revision through native selection operations, including source/only-node selection and modifier operations.
- Native editable mesh move, rotation, copy, array, detachment and source-selection movement increment geometry revision.
- Added three unit tests for display/selection/mesh revisions, and CI branch trigger.

## Important scope boundary
Direct writers outside this module, persisted source-link changes and all project import/restore paths have not been exhaustively audited. Hence full JSON source signature is **still required** and deliberately retained. It would be incorrect to claim that this branch replaces all source traversal with O(1) revision checks. The proper next step is exhaustive writer auditing/instrumentation, then guarded revision-only mode and lifecycle browser tests.

No formal acceptance. No main changes.
