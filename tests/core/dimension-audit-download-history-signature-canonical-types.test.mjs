import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySignature,
  dimensionAuditDownloadHistorySignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1142: history signature validation rejects coercible non-canonical fields",()=>{
  const snapshot={
    schema:"s",
    project_id:"p",
    project_name:"P",
    generated_at:"2026-10-09T00:00:00.000Z",
    summary_signature:"sum",
    protocol_state_signature:"protocol",
    attempt_count:1,
    attempts:[{signature:"a"}]
  };
  const malformed={...snapshot,attempt_count:"1"};
  const forged=dimensionAuditDownloadHistorySignature(malformed);
  assert.equal(dimensionAuditDownloadHistorySignatureValid(forged,malformed),false);
});
