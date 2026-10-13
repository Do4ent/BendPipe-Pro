import test from "node:test";
import assert from "node:assert/strict";
import {
  DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_PAYLOAD_BINDING_SCHEMA,
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportChain,
  dimensionAuditDownloadHistoryExportChainSnapshot,
  dimensionAuditDownloadHistoryExportPayloadBinding
} from "../../src/domain/measurements/audit-download.mjs";

test("question 779: canonical export payload binding ties history snapshot to chain snapshot",()=>{
  const history={snapshot_signature:"history-sig",attempt_count:2};
  const state=dimensionAuditDownloadHistoryExportReadinessState({
    attempt_count:2,verification_valid:true,trusted:true,provenance_valid:true,
    history_snapshot_signature:"history-sig",provenance_signature:"prov"
  });
  const chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot(dimensionAuditDownloadHistoryExportChain(state));
  const binding=dimensionAuditDownloadHistoryExportPayloadBinding(history,chainSnapshot);
  assert.equal(binding.schema,DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_PAYLOAD_BINDING_SCHEMA);
  assert.equal(binding.history_snapshot_signature,"history-sig");
  assert.equal(binding.chain_snapshot_signature,chainSnapshot.snapshot_signature);
  assert.equal(binding.history_signature_matches_chain,true);
  assert.equal(binding.attempt_count,2);
  assert.equal(binding.chain_attempt_count,2);
});
