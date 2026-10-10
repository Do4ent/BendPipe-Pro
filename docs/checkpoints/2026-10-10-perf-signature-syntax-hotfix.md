# PERF-001 syntax hotfix checkpoint — 2026-10-10

## Confirmed defect and correction
The previous `referenceSignature` instrumentation commit accidentally inserted literal backslash-n character pairs between JavaScript statements and comments. That is invalid JavaScript outside strings and would prevent DWFx reference scene code from parsing.

Corrected the literal escape sequences to real newlines in `src/import/dwfx/reference-scene-ui.js`.

## Prevention
Added explicit `node --check` for the DWFx reference renderer, performance runtime, standalone builder, and relevant PERF browser tests to the PERF CI job. This catches syntax errors before the full Node/browser suite.

## Scope
No change to the conservative nonempty-scene signature algorithm; O(1) revision-only checks remain disabled until writer coverage is established. CI passing status is not yet confirmed. Main unchanged.
