# TubeBender PERF-001 checkpoint — explicit source-link revision classification

- Reviewed central source-link command dispatcher in `src/import/dwfx/reference-scene-ui.js`.
- Removed fragile revision classification by Russian-language display text. Each of the five source-link menu commands now specifies `display` or `geometry` explicitly, independently of UI translation.
- Updated the existing regression test for revision notification before save/render and explicit classification.
- Added branch to PERF workflow.

**Remaining:** Other legacy project-load / replace entrypoints have not been exhaustively instrumented and tested. The JSON source-state comparison remains enabled. There is no justified O(1)-only claim and no Chromium acceptance yet.

No merge to main; draft checkpoint only.
