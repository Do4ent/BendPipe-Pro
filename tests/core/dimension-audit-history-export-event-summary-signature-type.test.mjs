import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventSummary,
  dimensionAuditDownloadHistoryExportEventSummarySignature,
  dimensionAuditDownloadHistoryExportEventSummarySignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 913: summary signature validation rejects boxed and empty strings",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",outcome:"blocked",code:"EMPTY",
    history_snapshot_signature:"h1",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const summary=dimensionAuditDownloadHistoryExportEventSummary([event]);
  const signature=dimensionAuditDownloadHistoryExportEventSummarySignature(summary);
  assert.equal(dimensionAuditDownloadHistoryExportEventSummarySignatureValid(signature,summary),true);
  assert.equal(dimensionAuditDownloadHistoryExportEventSummarySignatureValid(new String(signature),summary),false);
  assert.equal(dimensionAuditDownloadHistoryExportEventSummarySignatureValid("",summary),false);
});
