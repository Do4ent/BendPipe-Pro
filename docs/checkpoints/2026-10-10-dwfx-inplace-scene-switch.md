# TubeBender PERF-001 — in-place DWFx source collection replacement

Base branch: `feature/perf-dwfx-history-jump-revisions-20261010`.

- The generated `renderAll()` entrypoint now tracks both active project identity and `referenceScenes` collection identity.
- When a legacy path replaces `project.referenceScenes` without replacing the project object, the central DWFx geometry revision is incremented exactly once on the next render.
- Repeated renders with unchanged identities do not generate additional invalidations.
- Added executable VM-backed regression testing replacement of the scene array and project object.
- This is an O(1) **identity detection only**, not a general O(1) mutation guarantee: edits within the existing array or scene nodes still use conservative signature fallback and explicit writer hooks.

Checks: committed code reviewed at GitHub source level; Node/CI/Chromium execution not verified; main untouched. Further audit required for direct in-place writes and native Undo/Redo restoration.
