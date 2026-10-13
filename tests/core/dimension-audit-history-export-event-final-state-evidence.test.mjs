import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventSignature,
  dimensionAuditDownloadHistoryExportEventValid
} from "../../src/domain/measurements/audit-download.mjs";

test("questions 1008-1009: export event signs optional complete final-state evidence",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",
    outcome:"blocked",
    code:"EMPTY",
    history_snapshot_signature:"history",
    final_state_signature:"final-state",
    final_state_snapshot_signature:"final-snapshot",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  assert.equal(event.final_state_signature,"final-state");
  assert.equal(event.final_state_snapshot_signature,"final-snapshot");
  assert.equal(dimensionAuditDownloadHistoryExportEventValid(event),true);
  assert.equal(event.signature,dimensionAuditDownloadHistoryExportEventSignature(event));
  assert.throws(()=>buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",
    outcome:"blocked",
    code:"EMPTY",
    history_snapshot_signature:"history",
    final_state_signature:"only-one",
    generated_at:"2026-10-09T00:00:00.000Z"
  }),/final-state evidence/);
});
