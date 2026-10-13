import test from "node:test";
import assert from "node:assert/strict";
import {
  DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_READINESS_PROTOCOL_SCHEMA,
  dimensionAuditDownloadHistoryExportReadinessProtocol,
  dimensionAuditDownloadHistoryExportReadinessProtocolSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 717: audit download domain owns readiness protocol descriptor",()=>{
  assert.equal(DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_READINESS_PROTOCOL_SCHEMA,"TubeBender.DimensionAuditDownloadHistoryExportReadinessProtocol.v1");
  const protocol=dimensionAuditDownloadHistoryExportReadinessProtocol();
  assert.equal(protocol.state_schema,"TubeBender.DimensionAuditDownloadHistoryExportReadiness.v1");
  assert.equal(protocol.snapshot_schema,"TubeBender.DimensionAuditDownloadHistoryExportReadinessSnapshot.v1");
  assert.deepEqual(protocol.codes,["READY","EMPTY","VERIFICATION_FAILED","UNTRUSTED","INVALID_PROVENANCE"]);
  assert.equal(Object.isFrozen(protocol),true);
  assert.match(dimensionAuditDownloadHistoryExportReadinessProtocolSignature(protocol),/"snapshot_schema":"TubeBender.DimensionAuditDownloadHistoryExportReadinessSnapshot.v1"/);
});
