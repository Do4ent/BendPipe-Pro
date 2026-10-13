# TubeBender — questionnaire-oriented engineering checkpoint — 2026-10-10

## Accounting correction
- Do not interpret q141348 or q3898 as source questionnaire requirement numbers. The earlier qNNNN labels identify executable automated tests, many of which are source-string contracts.
- The canonical, approved questionnaire itself has not been recovered or verified in this session. Therefore **no original questionnaire item is claimed closed**.
- This checkpoint records one implemented engineering defect fix pending CI, not a fabricated numbered questionnaire milestone.

## Implementation
- Branch: feature/trusted-geometry-core; main unchanged.
- Fix commit: 71c100c56488e7e13b8b05f9b785a51dd0440269.
- File: src/recognition/topology-validation.mjs.
- Prior behavior: a standalone initial LINE with [0,0,0] direction could pass because only missing/nonfinite vectors were checked on the first primitive; zero tangent was detected only on pairwise boundaries.
- Updated behavior: zero tangent on the initial LINE or BEND emits UNDEFINED_TANGENT and disallows candidate_valid / canonical_ready. Existing nonfinite invalid primitive handling stays intact.
- Regression tests commit: 567c377e794cf1e37a370a0cadb9e7e70e89df11.
- Test coverage: initial zero LINE direction, zero start/end BEND tangent, valid single LINE preservation, nonfinite direction behavior.
- Manufacturing restrictions unchanged: production_ready=false, no machine compensation.

## Validation
- GitHub commits are recorded, but full CI for this code change has not been confirmed.
- The user requested continuation of the original questionnaire; next work must map numbered original requirements from an authoritative source rather than extend synthetic q identifiers.
