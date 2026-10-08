import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryHealth,
  dimensionAuditDownloadHistoryHealthSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 630: audit history health signature is deterministic",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({attempts:[]});
  const health=dimensionAuditDownloadHistoryHealth(snapshot);
  const signature=dimensionAuditDownloadHistoryHealthSignature(health);
  assert.equal(signature,dimensionAuditDownloadHistoryHealthSignature({...health,generated_at:"2099-01-01T00:00:00Z"}));
  assert.notEqual(signature,dimensionAuditDownloadHistoryHealthSignature({...health,envelope_valid:false}));
});
