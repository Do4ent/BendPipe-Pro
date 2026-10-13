# TubeBender engineering checkpoint — terminal primitive validation — 2026-10-10

## Provenance
- Repository: Do4ent/BendPipe-Pro; development branch: feature/trusted-geometry-core; main unchanged.
- This is a genuine source-code defect fix, NOT a newly numbered original questionnaire question. The original questionnaire numbering remains unverified.
- Prior checkpoint: checkpoint/questionnaire-core-fix-20261010.

## CI diagnosis
- Run #7884 (38043256417) concluded **failure**.
- Failure log includes repeated q137334 etc. in tests/core/topology-diagnostic-safety-q131299-q141348.test.mjs: invalid final LINE.end containing NaN was accepted as candidate_valid because only boundary-adjacent fields were validated.
- A zero direction in the first primitive was handled in prior commit; current change addresses terminal and other unexamined fields.

## Fix
- Commit d11415cd7c9f8b42d5137daed2419f9c7b566b87 changes src/recognition/topology-validation.mjs:
  - Intrinsically validate all four geometry fields of each supported primitive at any position (first remains checked in its own branch).
  - Report INVALID_PRIMITIVE_DATA for nonfinite/missing terminal endpoints or tangents.
  - Preserve original input; do not confer machine production approval.
- Regression test commit e467374a7c0bdd3ec44a39770fab480eeb14f6ca adds tests/core/topology-terminal-evidence.test.mjs.

## Verification status
- CI #7884 failed on the preceding version and must not be described as passing.
- Full CI of this updated source and regression suite pending at time of checkpoint creation.
- Next priority: confirm new run and inspect any legacy source-string assertions before claiming validated.
