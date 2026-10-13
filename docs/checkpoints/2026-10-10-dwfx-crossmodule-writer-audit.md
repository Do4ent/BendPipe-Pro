# TubeBender — audit of import, restore and source linkage writers (2026-10-10)

## Scope inspected
- src/import/dwfx/current-project-ui.js: installs the newly merged project via state.projects[projectIndex]=merged.project; this replaces reference scenes and source links together
- src/import/dwfx/current-project-merge.mjs: pure merge constructs referenceScenes and currentProjectImport.source_link in returned project; do not put UI side effects into the pure merge function
- src/import/dwfx/reference-scene-ui.js: restorePersistedRuntimes(project) registers embedded runtimes; registration already bumps geometry but no-runtime restores previously did not invalidate
- scripts/build-standalone.mjs: imports/registers reference runtime and drives viewport rendering; other legacy project-file open/replace handlers require a full source audit

## Changes
1. After installing merged.project, current-project-ui now calls TubeBenderReferenceSceneUi?.markSceneChanged?.(merged.project,"geometry") to invalidate scene cache before saving and rendering.
2. restorePersistedRuntimes(project) explicitly marks the geometry revision and invalidates the cache even when the restored project contains no persisted runtime.
3. Three regression tests check both hooks and the retained conservative linkage signature.

## Remaining gaps and risk
- Arbitrary direct edits to tube.currentProjectImport.source_link / linked display fields may occur from legacy scripts not captured by current connected search; all mutation writers have NOT been exhaustively verified.
- Restoring or opening projects through legacy UI paths may bypass restorePersistedRuntimes; those paths must be instrumented with explicit notifications or centralized project replacement API.
- Do NOT switch to revision-only/O(1) detection until every external writer has been audited and tested. JSON source-state signature stays as correctness fallback.
- Tests were added but no confirmed passing CI result or Chromium performance acceptance is claimed.

No change to main; no formal acceptance.
