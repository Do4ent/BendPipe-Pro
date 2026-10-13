import test from "node:test";
import assert from "node:assert/strict";
import {
  buildReviewProgressDiagnostics,
  reviewProgressDiagnosticsSignature
} from "../../src/domain/measurements/review-progress.mjs";

test("question 393: review diagnostics signature is deterministic",()=>{
  const a=buildReviewProgressDiagnostics({
    reason_count:2,
    count_consistent:false,
    lists_consistent:true,
    model_consistent:true,
    domain_status:"compatible",
    domain_consistent:false
  });
  const b={...a,errors:[...a.errors],supported_error_codes:[...a.supported_error_codes]};
  assert.equal(reviewProgressDiagnosticsSignature(a),reviewProgressDiagnosticsSignature(b));
  assert.match(reviewProgressDiagnosticsSignature(a),/REVIEW_REASON_COUNT_MISMATCH/);
  assert.match(reviewProgressDiagnosticsSignature(a),/REVIEW_PROGRESS_DOMAIN_DIVERGENCE/);
});
