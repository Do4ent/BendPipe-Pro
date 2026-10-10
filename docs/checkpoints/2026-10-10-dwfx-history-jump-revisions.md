# TubeBender PERF-001 — DWFx history timeline restoration (2026-10-10)

Base: `feature/perf-legacy-project-switch-20261010`; working branch: `feature/perf-dwfx-history-jump-revisions-20261010`.

- When a History timeline jump successfully restores a snapshot, notify the central DWFx revision tracker with a geometry change before updating the timeline UI.
- Failed restoration exits before notification; jumps to the current cursor exit before restoration.
- Added focused Node regression for the generated History-jump hook and its ordering.
- Preserve the conservative JSON source signature fallback for other legacy in-place mutation paths.
- `main` is unchanged.

Verification: reviewed the committed generated source anchor and regression test via GitHub API. Node suite, standalone build, CI and Chromium/Playwright testing were **not** executed in this session (local GitHub network access unavailable; workflow run not present).

Next: instrument Undo/Redo and all remaining direct project state replacements, then run build + regression and Chromium acceptance when an execution runner is available. No O(1)-only performance claim.
