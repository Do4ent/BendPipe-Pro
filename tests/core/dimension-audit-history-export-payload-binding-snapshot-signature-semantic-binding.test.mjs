import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportPayloadBinding,
  dimensionAuditDownloadHistoryExportPayloadBindingSnapshot,
  dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignature,
  dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1254: payload-binding snapshot signature validator binds to nested binding signature",()=>{
  const binding=dimensionAuditDownloadHistoryExportPayloadBinding();
  const snapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(binding);
  const impossible={...snapshot,binding_signature:snapshot.binding_signature+"x"};
  const forged=dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignature(impossible);
  assert.equal(dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignatureValid(forged,impossible),false);
});
