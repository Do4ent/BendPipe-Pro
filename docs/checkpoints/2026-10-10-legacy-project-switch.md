# TubeBender PERF-001 — legacy project replacement tracking (2026-10-10)

- Centralized active-project identity tracking in generated standalone viewer `renderAll()` entrypoint, which is shared by standard project open, restore and project-switch UI redraw paths.
- The initial render does not emit a spurious source mutation. Subsequent changes in active project **object identity** call `TubeBenderReferenceSceneUi.markSceneChanged(project,'geometry')` once, invalidating its cached DWFx scene.
- Regular renders of the unchanged project identity do not force cache invalidation. This complements runtime replacement, project merge, restore and source-link hooks from earlier PRs.
- Added a Node test for generated callback and identity-based notifications, and enabled CI branch trigger.

Scope boundary: project data can be mutated **in place** and some legacy paths may avoid `renderAll()`. Their writes are still covered by conservative source-state JSON signature, not reliably by revision events. Thus O(1)-only detection is NOT enabled or claimed. Real Chromium testing and CI results are pending. No acceptance and main is untouched.
