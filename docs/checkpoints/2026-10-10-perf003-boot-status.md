# PERF-003 truthful startup status — 2026-10-10

## Confirmed defect
The generated standalone bootstrap previously assigned `status.booted=true` unconditionally after isolated startup stages, even if the core `bind()` phase threw. This could mislead Chromium acceptance polling and users about command palette availability.

## Fix
- `booted` is now true only if an isolated stage named `bind` returned `ok`.
- The initial heavy render is not scheduled when bind failed.
- Optional stage failures remain isolated; a successful bind still sets `booted` to true.
- Added `tests/core/perf-startup-boot-status.test.mjs` with source contract and both failure/success scenarios.

## Verification boundary
The change is committed but successful CI results for this head are not available yet. Main is unchanged. PERF-001 quantitative acceptance and PERF-003 end-to-end Chromium acceptance remain open.
