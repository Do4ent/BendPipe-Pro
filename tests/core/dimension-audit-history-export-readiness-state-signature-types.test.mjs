import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportReadinessStateSignature,
  dimensionAuditDownloadHistoryExportReadinessStateSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 957: readiness state signature validation requires non-empty primitive string",()=>{
  const state=dimensionAuditDownloadHistoryExportReadinessState();
  const signature=dimensionAuditDownloadHistoryExportReadinessStateSignature(state);
  assert.equal(dimensionAuditDownloadHistoryExportReadinessStateSignatureValid(signature,state),true);
  assert.equal(dimensionAuditDownloadHistoryExportReadinessStateSignatureValid(new String(signature),state),false);
  assert.equal(dimensionAuditDownloadHistoryExportReadinessStateSignatureValid("",state),false);
});
