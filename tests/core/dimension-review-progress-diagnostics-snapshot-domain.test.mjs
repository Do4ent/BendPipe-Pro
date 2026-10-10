import test from "node:test";
import assert from "node:assert/strict";
import {
  buildReviewProgressDiagnostics,
  reviewProgressDiagnosticsSnapshot,
  reviewProgressDiagnosticsSignature,
  REVIEW_PROGRESS_DIAGNOSTICS_SNAPSHOT_SCHEMA
} from "../../src/domain/measurements/review-progress.mjs";

test("question 403: review diagnostics snapshot is normalized immutable and signed",()=>{
  const diagnostics=buildReviewProgressDiagnostics({
    reason_count:2,
    count_consistent:true,
    lists_consistent:true,
    model_consistent:true,
    domain_status:"compatible",
    domain_consistent:true
  });
  const snapshot=reviewProgressDiagnosticsSnapshot(diagnostics);
  assert.equal(snapshot.schema,REVIEW_PROGRESS_DIAGNOSTICS_SNAPSHOT_SCHEMA);
  assert.equal(snapshot.diagnostics_schema,diagnostics.schema);
  assert.equal(snapshot.signature,reviewProgressDiagnosticsSignature(diagnostics));
  assert.equal(snapshot.valid,true);
  assert.equal(snapshot.status,"ok");
  assert.equal(Object.isFrozen(snapshot),true);
  assert.equal(Object.isFrozen(snapshot.supported_error_codes),true);
  assert.equal(Object.isFrozen(snapshot.errors),true);
});
