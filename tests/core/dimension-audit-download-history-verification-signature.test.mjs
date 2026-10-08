import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryVerification,
  dimensionAuditDownloadHistoryVerificationSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 646: canonical audit history verification signature is deterministic",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({attempts:[]});
  const verification=dimensionAuditDownloadHistoryVerification(snapshot);
  const signature=dimensionAuditDownloadHistoryVerificationSignature(verification);
  assert.equal(
    signature,
    dimensionAuditDownloadHistoryVerificationSignature({...verification,generated_at:"2099-01-01T00:00:00Z"})
  );
  assert.notEqual(
    signature,
    dimensionAuditDownloadHistoryVerificationSignature({...verification,health_embedding_valid:false})
  );
});
