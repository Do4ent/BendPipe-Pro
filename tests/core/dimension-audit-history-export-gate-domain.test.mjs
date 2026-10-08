import test from "node:test";
import assert from "node:assert/strict";
import {
  DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_GATE_SCHEMA,
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportReadinessSnapshot,
  dimensionAuditDownloadHistoryExportGate
} from "../../src/domain/measurements/audit-download.mjs";

test("question 730: canonical history readiness export gate reports integrity-specific reasons",()=>{
  const emptyState=dimensionAuditDownloadHistoryExportReadinessState();
  const emptySnapshot=dimensionAuditDownloadHistoryExportReadinessSnapshot(emptyState);
  const emptyGate=dimensionAuditDownloadHistoryExportGate(emptySnapshot,emptyState);
  assert.equal(emptyGate.schema,DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_GATE_SCHEMA);
  assert.equal(emptyGate.allowed,false);
  assert.equal(emptyGate.code,"EMPTY");

  const readyState=dimensionAuditDownloadHistoryExportReadinessState({
    attempt_count:1,
    verification_valid:true,
    trusted:true,
    provenance_valid:true,
    history_snapshot_signature:"history",
    provenance_signature:"prov"
  });
  const readySnapshot=dimensionAuditDownloadHistoryExportReadinessSnapshot(readyState);
  assert.equal(dimensionAuditDownloadHistoryExportGate(readySnapshot,readyState).code,"READY");

  assert.equal(
    dimensionAuditDownloadHistoryExportGate({...readySnapshot,protocol_valid:false},readyState).code,
    "INVALID_PROTOCOL"
  );
  assert.equal(
    dimensionAuditDownloadHistoryExportGate({...readySnapshot,protocol_signature_valid:false},readyState).code,
    "INVALID_PROTOCOL_SIGNATURE"
  );
  assert.equal(
    dimensionAuditDownloadHistoryExportGate({...readySnapshot,snapshot_signature_valid:false},readyState).code,
    "INVALID_SNAPSHOT_SIGNATURE"
  );
});
