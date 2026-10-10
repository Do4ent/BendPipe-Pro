# PERF-001 DWFx signature timing completeness — 2026-10-10

## Verified in source
The existing telemetry began its timer **after** building `sourceLinks` from all project tubes. For large tube collections this omitted an O(n) cost and made signature telemetry too optimistic.

## Changes
- Move `started=meshNow()` before the `sourceLinks` map in the nonempty-reference path.
- Keep the conservative signature unchanged, including legacy-writer safety and the empty-reference fast path.
- Add `perf-dwfx-signature-full-cost.test.mjs`, a source-order contract test for timer, traversal, serialization and duration recording.

## Status
Committed to the PR #24 head branch, not main. Actual browser timing and CI results are not yet confirmed. Nonempty DWFx signatures still walk source metadata; revision-only O(1) fast paths must wait for a full external writer audit.
