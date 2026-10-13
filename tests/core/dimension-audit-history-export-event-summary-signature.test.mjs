import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventSummary,
  dimensionAuditDownloadHistoryExportEventSummarySignature,
  dimensionAuditDownloadHistoryExportEventSummaryValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 849: export event summary has its own deterministic signature",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",outcome:"blocked",code:"EMPTY",
    history_snapshot_signature:"history-a",
    generated_at:"2026-10-08T20:00:00.000Z"
  });
  const summary=dimensionAuditDownloadHistoryExportEventSummary([event]);
  assert.equal(summary.signature,dimensionAuditDownloadHistoryExportEventSummarySignature(summary));
  assert.equal(dimensionAuditDownloadHistoryExportEventSummaryValid(summary,[event]),true);

  const tampered={...summary,blocked:0};
  assert.notEqual(dimensionAuditDownloadHistoryExportEventSummarySignature(tampered),summary.signature);
  assert.equal(dimensionAuditDownloadHistoryExportEventSummaryValid(tampered,[event]),false);
});
