# PERF-001 — Single-pass source indexing and PR CI trigger (2026-10-10)

## Change in real renderer
`buildProjectSourceRenderIndex(project)` previously scanned the project tube collection through `linkedEditableTubes(project)` and then again via `editablePartSet(project)`. It also accessed `currentProjectImport` multiple times per tube.

The renderer now builds all four accepted editable-part identifiers and both first-match source-link indexes in **one pass** through the tubes, reading each tube's import state once. The change preserves:
- the first source link, even if detached, and the first non-detached link separately;
- numeric part `0` and strings with leading zeros (such as `"007"`);
- `partNumber`, `part_number`, `importEvidence.part_number`, and `currentProjectImport.part_number`;
- all previously indexed mesh instances and selected object IDs.

## CI wiring
The PERF GitHub Actions workflow's `pull_request.branches` only included `feature/mobile-viewport-mob001-20261010`, which did not match PR #24's current base, `feature/perf-dwfx-crossmodule-audit-20261010`. The current PR base has been added to that filter. Push-event wiring remains unchanged. **A CI run has not yet been independently confirmed**; branch workflow configuration may require corresponding base-branch checks.

## Verification
- Synthetic 2,000-tube source-index test: import-state getter reads reduced from **6,002 to 2,000**, with identical first-match, editable-part, and mesh-instance results.
- New regression test `tests/core/perf-dwfx-single-pass-index.test.mjs` added to the PERF workflow.
- Ten current DWFx regression scenarios (new single-pass indexing, source indexing, project-wide indexing, in-flight mutations and legacy source-link fallback) executed successfully in a controlled V8 harness against fetched current source: **10/10 passed**.
- Syntax parse check of the updated DWFx renderer passed.

## Acceptance boundary
This is an isolated in-memory source/runtime check, **not** a full `node --test` suite, not Chromium acceptance, and not a representative CAD performance benchmark. The conservative signature fallback remains enabled and `main` is unchanged. Work remains on draft PR #24.
