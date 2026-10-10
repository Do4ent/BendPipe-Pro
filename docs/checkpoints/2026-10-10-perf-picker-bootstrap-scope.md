# PERF-003 — Chromium optional picker bootstrap scope (2026-10-10)

## Observed failure (actual Chromium evidence)
GitHub Actions run [38087636295](https://github.com/Do4ent/BendPipe-Pro/actions/runs/38087636295), Chromium PERF-001/PERF-003 job, captured:
```
ReferenceError: tbRunIsolatedStartup is not defined
at bind (...)
```
Both browser acceptance tests timed out before startup was confirmed. This is an observed failure, not a passing result.

## Cause and targeted fix
The legacy `bind()` picker initialization used `tbRunIsolatedStartup()` injected later as part of a generated standalone bootstrap. An early `bind()` invocation can run before that helper is available. The generated optional-picker block now handles each picker locally and isolates a failure without relying on the cross-script helper.

The first version of this replacement emitted literal `\\n` escape text into executable JavaScript. Follow-up commit `0e1a776f` fixes the builder to emit actual line breaks. Verified by inspecting the committed source: four regular JS string newline escapes, zero double-escaped newline sequences in this replacement block.

Commit `8974943e` adds a focused VM regression that executes the **actual builder replacement statement** and then runs the generated picker code. The fixture causes `buildBendPicker()` to throw and expects `setupMiniAxisClickHandlers()` still to run. It also rejects literal `\\n` in generated JavaScript and the early dependency on `tbRunIsolatedStartup`.

## Acceptance boundaries
- Committed generator source and regression test have been inspected.
- The focused new Node test and fresh GitHub Actions/Chromium run have **not** been observed passing yet.
- Full `npm test` was previously red (105 failures out of 147,707 in run 38087636295). These existing contract failures remain unresolved.
- Keep [PR #33](https://github.com/Do4ent/BendPipe-Pro/pull/33) draft; do not merge to main until Chromium smoke and core checks pass.
