# PERF-001 DWFx signature phase telemetry — 2026-10-10

Extended the conservative DWFx signature measurements to distinguish source-link collection from JSON serialization. New `sceneReuseStats()` fields: `lastLinksTimeMs` and `lastSerializeTimeMs`. A deterministic clock regression checks phase durations and unchanged scene reuse after an ordinary tube edit.

This is an instrumentation-only step. It does not bypass conservative comparison on nonempty imported scenes, so uninstrumented legacy source writers continue to be detected. Further optimization should be selected based on observed phase costs from a representative DWFx file.

No passing Chromium or CI result claimed. No changes to main.
