# DWFx write-path audit — 2026-10-10

Scope: PERF-001/PERF-003 revision-driven cache invalidation on `feature/perf-dwfx-signature-fastpath-20261010`.

## Checked paths and safeguards

| Mutation path | Revision handling | Finding |
| --- | --- | --- |
| Runtime registration and persisted runtime restoration | geometry; explicit cache invalidation on restore | Covered |
| Current-project DWFx merge/scene replacement | external `markSceneChanged(merged.project, "geometry")` | Covered for known UI merge path |
| Source tree hide/show/isolate/transparency | display | Covered |
| Bulk/tree selection and direct tree selection | selection | Covered; direct-click/reveal writers patched |
| Editable mesh instance create/ensure | geometry | Patched |
| Editable mesh instance translate/rotate/copy/array | geometry | Covered (some nested operations increment more than once) |
| Editable mesh instance detach | geometry | Covered |
| Source tree bulk deletion | geometry + selection | Patched |
| Tube source-link show/hide/compare | display | Patched |
| Tube source-link detach | geometry | Patched |
| Source snapshot restore to editable tube | changes editable geometry, not DWFx reference mesh | DWFx source cache unaffected |
| Expanded/collapsed tree UI | tree layout only | Deliberately not a 3D scene invalidation |
| External object-context selection | included in short cache key even in tracked mode | Covered without scanning geometry |

## Unresolved boundary / fast-path activation gate

The `project.dwfx_revision_tracking_complete === true` fast path must remain **off by default**. The project model is mutable, and third-party / legacy code can directly replace `referenceScenes`, `editable_mesh_instances`, `currentProjectImport.source_link` or visibility fields without calling `markSceneChanged`. A code review of the known DWFx module writers does not prove all such paths instrumented.

To enable tracking for general persisted projects safely:

1. Centralize source scene, mesh instance and source-link writes through project commands, or proxy/enforce writes.
2. Audit legacy project loading, undo/redo, import replacement, external object-context actions and cross-module programmatic updates.
3. Add integration tests that mutate each path and assert invalidation + fresh rendered output.
4. Enable `dwfx_revision_tracking_complete` only for projects proven to use instrumented writes; never infer it merely from a saved flag in untrusted project data.
5. Run Node and browser performance/acceptance tests in CI before merging.

## Review result

**Internal DWFx UI write-path audit: addressed known missing revision bumps.**
**Cross-module end-to-end audit: NOT fully proven.**
**General fast-path activation: BLOCKED.**

No change has been made to `main`; the conservative deep signature remains the default.


## Legacy cross-module review follow-up

Reviewed `legacy/VC207R7/TubeBender_CAD_VC207R7_Pixel_Matched_Approved_Interface_Release.html`:
- `tbHistoryRestore` replaces `state` with a cloned snapshot; `tbUndo`/`tbRedo` call it without notifying the DWFx scene runtime.
- `poExecuteOpen` can replace `state.projects` or append imported projects directly without a revision notification.
- `poCreateEditableCopy` pushes a copied project directly into `state.projects`.
- `src/application/model-history.mjs` is a pure snapshot history model; invalidation must occur in its application integration, not in the generic history engine.

**Security/correctness gate:** the persisted `dwfx_revision_tracking_complete` field no longer enables the fast path alone. A private session-local `WeakSet` is additionally required and has no enrollment path until all legacy writer integrations are instrumented. Consequently all current projects use the conservative key; the dormant fast path remains for future activation.

Verification: regression tests committed, execution in this environment unavailable (GitHub checkout network resolution failed). Browser acceptance and runtime performance improvements have not been demonstrated.
