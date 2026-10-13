import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryVerification,
  dimensionAuditDownloadHistoryVerificationSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 649: history snapshot embeds signed canonical verification",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({
    project_id:"p1",
    project_name:"Project",
    attempts:[]
  });
  assert.ok(snapshot.verification);
  assert.equal(
    snapshot.verification_signature,
    dimensionAuditDownloadHistoryVerificationSignature(snapshot.verification)
  );
  const current=dimensionAuditDownloadHistoryVerification(snapshot);
  assert.equal(
    snapshot.verification_signature,
    dimensionAuditDownloadHistoryVerificationSignature(current)
  );
});
