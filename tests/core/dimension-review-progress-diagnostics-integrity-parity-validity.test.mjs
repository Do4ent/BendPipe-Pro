import test from "node:test";
import assert from "node:assert/strict";
import {
  reviewProgressDiagnosticsIntegrity,
  reviewProgressDiagnosticsIntegritySignature
} from "../../src/domain/measurements/review-progress.mjs";

test("question 425: diagnostics integrity includes parity and fails closed on divergence",()=>{
  const runtime={
    source:"domain",
    domain_available:true,
    domain_compatible:true,
    domain_status:"compatible",
    diagnostics_available:true,
    snapshot_signature_consistent:true,
    runtime_valid:true
  };
  const aligned=reviewProgressDiagnosticsIntegrity(runtime,true,true);
  assert.equal(aligned.parity_available,true);
  assert.equal(aligned.parity_consistent,true);
  assert.equal(aligned.valid,true);

  const diverged=reviewProgressDiagnosticsIntegrity(runtime,true,false);
  assert.equal(diverged.parity_available,true);
  assert.equal(diverged.parity_consistent,false);
  assert.equal(diverged.valid,false);
  assert.notEqual(
    reviewProgressDiagnosticsIntegritySignature(aligned),
    reviewProgressDiagnosticsIntegritySignature(diverged)
  );

  const unavailable=reviewProgressDiagnosticsIntegrity(runtime,true,null);
  assert.equal(unavailable.parity_available,false);
  assert.equal(unavailable.parity_consistent,null);
  assert.equal(unavailable.valid,true);
});
