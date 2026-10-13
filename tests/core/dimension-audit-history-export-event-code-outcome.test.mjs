import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventSignature,
  dimensionAuditDownloadHistoryExportEventValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 844: export event code is semantically bound to outcome",()=>{
  assert.throws(()=>buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",outcome:"blocked",code:"READY",
    history_snapshot_signature:"history-a",
    generated_at:"2026-10-08T20:00:00.000Z"
  }),/cannot use READY code/);

  assert.throws(()=>buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",outcome:"copied",code:"NOT_READY",
    history_snapshot_signature:"history-a",
    action_permit_signature:"permit",
    action_permit_snapshot_signature:"permit-snapshot",
    generated_at:"2026-10-08T20:00:00.000Z"
  }),/requires READY code/);

  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",outcome:"blocked",code:"EMPTY",
    history_snapshot_signature:"history-a",
    generated_at:"2026-10-08T20:00:00.000Z"
  });
  const contradictory={...event,code:"READY"};
  contradictory.signature=dimensionAuditDownloadHistoryExportEventSignature(contradictory);
  assert.equal(dimensionAuditDownloadHistoryExportEventValid(contradictory),false);
});
