import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventSignature,
  dimensionAuditDownloadHistoryExportEventValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 842: every export event is bound to a concrete history snapshot signature",()=>{
  assert.throws(()=>buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",outcome:"blocked",code:"EMPTY",
    generated_at:"2026-10-08T20:00:00.000Z"
  }),/requires history snapshot signature/);

  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",outcome:"blocked",code:"EMPTY",
    history_snapshot_signature:"history-a",
    generated_at:"2026-10-08T20:00:00.000Z"
  });
  assert.equal(dimensionAuditDownloadHistoryExportEventValid(event),true);

  const unbound={...event,history_snapshot_signature:""};
  unbound.signature=dimensionAuditDownloadHistoryExportEventSignature(unbound);
  assert.equal(dimensionAuditDownloadHistoryExportEventValid(unbound),false);
});
