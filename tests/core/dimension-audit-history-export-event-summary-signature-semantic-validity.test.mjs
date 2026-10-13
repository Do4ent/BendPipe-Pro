import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventSummary,
  dimensionAuditDownloadHistoryExportEventSummarySignature,
  dimensionAuditDownloadHistoryExportEventSummarySignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1237: export-event summary signature validator rejects self-signed inconsistent counters",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",
    outcome:"blocked",
    code:"EMPTY",
    history_snapshot_signature:"h",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const summary=dimensionAuditDownloadHistoryExportEventSummary([event]);
  const impossible={...summary,total:2};
  const forged=dimensionAuditDownloadHistoryExportEventSummarySignature(impossible);
  assert.equal(dimensionAuditDownloadHistoryExportEventSummarySignatureValid(forged,impossible),false);
});
