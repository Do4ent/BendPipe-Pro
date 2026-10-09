import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventSummary,
  dimensionAuditDownloadHistoryExportEventSummarySignature,
  dimensionAuditDownloadHistoryExportEventSummarySignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 867: export-event summary signature has explicit validation API",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",outcome:"blocked",code:"EMPTY",
    history_snapshot_signature:"history-a",
    generated_at:"2026-10-08T20:00:00.000Z"
  });
  const summary=dimensionAuditDownloadHistoryExportEventSummary([event]);
  const signature=dimensionAuditDownloadHistoryExportEventSummarySignature(summary);
  assert.equal(dimensionAuditDownloadHistoryExportEventSummarySignatureValid(signature,summary),true);
  assert.equal(dimensionAuditDownloadHistoryExportEventSummarySignatureValid(signature+"x",summary),false);
});
