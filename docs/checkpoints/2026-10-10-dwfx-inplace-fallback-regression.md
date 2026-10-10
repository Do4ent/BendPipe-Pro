# PERF-001 / PERF-003 — conservative DWFx in-place mutation fallback (2026-10-10)

Audited `referenceSignature(project, geomScale)` in `src/import/dwfx/reference-scene-ui.js`. Its current JSON signature includes the complete DWFx scene collection, editable mesh instances, linked imported tube source references, selection state, scale and revision counters. Therefore in-place mutations that bypass explicit notifications remain detectable at render time. This is a deliberate O(n) correctness fallback, not an O(1) render guarantee.

Added executable Node/VM regression cases for:
- nested `referenceScenes[0].tree[0].geometry_instances[0].asset_id` edits, preserving project and array identities;
- changing `referenceScenes[0].visible` in place;
- changing a nested DWFx tube `source_link.node_id` in place.

No production optimization is applied here because removing the JSON fallback before exhaustive writer coverage would risk stale CAD geometry. Tests are authored, not run; Chromium and CI not verified. Do not merge to main pending acceptance.
