import test from "node:test";
import assert from "node:assert/strict";
import {
  REVIEW_PROGRESS_SCHEMA,
  REVIEW_PROGRESS_SNAPSHOT_SCHEMA,
  REVIEW_PROGRESS_DIAGNOSTICS_SCHEMA,
  REVIEW_PROGRESS_ERROR_CODES,
  REVIEW_PROGRESS_AUDIT_ERROR_CODES
} from "../../src/domain/measurements/review-progress.mjs";

test("question 367: review progress domain protocol exports are stable and immutable",()=>{
  assert.equal(REVIEW_PROGRESS_SCHEMA,"TubeBender.DimensionReviewProgress.v1");
  assert.equal(REVIEW_PROGRESS_SNAPSHOT_SCHEMA,"TubeBender.DimensionReviewProgressSnapshot.v1");
  assert.equal(REVIEW_PROGRESS_DIAGNOSTICS_SCHEMA,"TubeBender.DimensionReviewProgressDiagnostics.v1");
  assert.deepEqual(REVIEW_PROGRESS_ERROR_CODES,[
    "REVIEW_REASON_COUNT_MISMATCH",
    "REVIEW_REASON_LIST_MISMATCH"
  ]);
  assert.deepEqual(REVIEW_PROGRESS_AUDIT_ERROR_CODES,[
    "REVIEW_REASON_COUNT_MISMATCH",
    "REVIEW_REASON_LIST_MISMATCH",
    "REVIEW_PROGRESS_MODEL_DIVERGENCE",
    "REVIEW_PROGRESS_DOMAIN_DIVERGENCE"
  ]);
  assert.equal(Object.isFrozen(REVIEW_PROGRESS_ERROR_CODES),true);
  assert.equal(Object.isFrozen(REVIEW_PROGRESS_AUDIT_ERROR_CODES),true);
});
