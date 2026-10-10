# PERF-001 / PERF-003 — CI unblocked and DWFx one-pass lookup (2026-10-10)

## Implementation
- Added the current PR #24 base branch `feature/perf-dwfx-crossmodule-audit-20261010` to the PERF workflow's pull-request trigger. The existing push trigger remains intact.
- Consolidated the DWFx source-link lookup and four editable-part identifier fields into one traversal of the tube list, reading each `currentProjectImport` only once per index build.
- Added a focused regression test for 2,000 tubes, detached-versus-linked first-match ordering, numeric zero and leading-zero part numbers, selected tubes, and editable mesh lookup. Added the test to CI.

## Real GitHub Actions investigation
- PR #24 run `38079821447` / #129 failed the `core-perf` syntax-check step because `tests/browser/perf-001-startup-longtasks.spec.mjs` contained invalid literal backslash-n sequences and a malformed `Promise.race`.
- Corrected that browser diagnostic test, reinstated bounded `page.evaluate` evidence capture, and attached capped console and page-error evidence.
- On subsequent run `38079897452` / #131, **syntax checking passed**, and core-perf proceeded to `Run existing regression suite`; Chromium job proceeded to `Verify PERF-001 and PERF-003 in Chromium`. Both jobs were still in progress at the most recent check, so neither is claimed green.

## Isolated verification
- Synthetic source index, 2,000 tubes: `currentProjectImport` getter reads **6,002 before / 2,000 after**. First-match precedence and part-number semantics were unchanged.
- **10/10 DWFx-related scenarios passed** under an isolated V8 harness evaluating exact fetched source. Real Node and Chromium remain separately tracked.
- All three browser PERF spec files parsed in local JavaScript syntax checks; additionally, GitHub Actions run #131 passed its syntax-check step.

## Outstanding
Confirm actual results of full Node `npm test`, standalone build, and Chromium browser acceptance. The CI trigger edit is present on the PR head; the underlying base branch's configuration has not been modified. Do not merge to `main` before acceptance.
