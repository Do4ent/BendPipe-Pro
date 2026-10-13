import test from "node:test";
import assert from "node:assert/strict";
import {
  buildReviewProgressDiagnostics,
  REVIEW_PROGRESS_DIAGNOSTICS_SCHEMA,
  REVIEW_PROGRESS_AUDIT_ERROR_CODES
} from "../../src/domain/measurements/review-progress.mjs";

test("question 392: review diagnostics model is self-describing",()=>{
  const diagnostics=buildReviewProgressDiagnostics({reason_count:1});
  assert.equal(diagnostics.schema,REVIEW_PROGRESS_DIAGNOSTICS_SCHEMA);
  assert.deepEqual(diagnostics.supported_error_codes,REVIEW_PROGRESS_AUDIT_ERROR_CODES);
  assert.equal(Object.isFrozen(diagnostics),true);
  assert.equal(Object.isFrozen(diagnostics.supported_error_codes),true);
});
