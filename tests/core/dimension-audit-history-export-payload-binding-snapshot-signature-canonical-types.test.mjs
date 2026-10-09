import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignature,
  dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1149: payload-binding snapshot signature requires canonical signed field types",()=>{
  const snapshot={schema:"s",binding_signature:"b",binding_valid:true,binding_signature_valid:true};
  const malformed={...snapshot,binding_valid:1};
  const forged=dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignature(malformed);
  assert.equal(dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignatureValid(forged,malformed),false);
});
