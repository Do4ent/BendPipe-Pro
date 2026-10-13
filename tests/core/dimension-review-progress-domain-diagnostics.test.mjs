import test from "node:test";
import assert from "node:assert/strict";
import {
  buildReviewProgressDiagnostics
} from "../../src/domain/measurements/review-progress.mjs";

test("question 385: review progress diagnostics are centralized in the domain model",()=>{
  const clean=buildReviewProgressDiagnostics({
    reason_count:2,
    count_consistent:true,
    lists_consistent:true,
    model_consistent:true,
    domain_status:"compatible",
    domain_consistent:true
  });
  assert.deepEqual(clean.errors,[]);
  assert.equal(clean.issue_count,0);
  assert.equal(clean.primary_error,null);
  assert.equal(clean.valid,true);
  assert.equal(clean.status,"ok");

  const unavailable=buildReviewProgressDiagnostics({
    reason_count:1,
    domain_status:"unavailable"
  });
  assert.equal(unavailable.valid,true);
  assert.deepEqual(unavailable.errors,[]);

  const diverged=buildReviewProgressDiagnostics({
    reason_count:1,
    domain_status:"compatible",
    domain_consistent:false
  });
  assert.deepEqual(diverged.errors,["REVIEW_PROGRESS_DOMAIN_DIVERGENCE"]);
  assert.equal(diverged.primary_error,"REVIEW_PROGRESS_DOMAIN_DIVERGENCE");
  assert.equal(diverged.valid,false);
  assert.equal(diverged.status,"error");

  const incompatible=buildReviewProgressDiagnostics({
    reason_count:1,
    domain_status:"incompatible"
  });
  assert.deepEqual(incompatible.errors,["REVIEW_PROGRESS_DOMAIN_INCOMPATIBLE"]);
  assert.equal(incompatible.valid,false);

  assert.throws(
    ()=>buildReviewProgressDiagnostics({domain_status:"future"}),
    /domain_status must be unavailable, compatible or incompatible/
  );
});
