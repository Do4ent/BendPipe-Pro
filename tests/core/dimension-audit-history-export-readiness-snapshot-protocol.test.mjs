import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportReadinessSnapshot,
  dimensionAuditDownloadHistoryExportReadinessProtocolSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 723: readiness snapshot embeds canonical protocol metadata",()=>{
  const snapshot=dimensionAuditDownloadHistoryExportReadinessSnapshot(
    dimensionAuditDownloadHistoryExportReadinessState()
  );
  assert.equal(snapshot.protocol.schema,"TubeBender.DimensionAuditDownloadHistoryExportReadinessProtocol.v1");
  assert.equal(snapshot.protocol_signature,dimensionAuditDownloadHistoryExportReadinessProtocolSignature(snapshot.protocol));
  assert.equal(snapshot.protocol_valid,true);
  assert.equal(snapshot.protocol_signature_valid,true);
  assert.equal(Object.isFrozen(snapshot.protocol),true);
});
