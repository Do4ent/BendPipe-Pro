import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportActionPermitSnapshotSignature,
  dimensionAuditDownloadHistoryExportActionPermitSnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1151: action-permit snapshot signature validation rejects coercible non-canonical fields",()=>{
  const snapshot={schema:"s",permit_signature:"p",permit_valid:true,permit_signature_valid:true};
  const malformed={...snapshot,permit_valid:1};
  const forged=dimensionAuditDownloadHistoryExportActionPermitSnapshotSignature(malformed);
  assert.equal(dimensionAuditDownloadHistoryExportActionPermitSnapshotSignatureValid(forged,malformed),false);
});
