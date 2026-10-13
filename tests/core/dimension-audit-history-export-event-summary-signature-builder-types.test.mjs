import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventSummary,
  dimensionAuditDownloadHistoryExportEventSummarySignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1164: export-event summary signature builder rejects coercible fields",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",
    outcome:"blocked",
    code:"EMPTY",
    history_snapshot_signature:"h",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const summary=dimensionAuditDownloadHistoryExportEventSummary([event]);
  assert.doesNotThrow(()=>dimensionAuditDownloadHistoryExportEventSummarySignature(summary));
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportEventSummarySignature({
      ...summary,
      total:{valueOf:()=>summary.total}
    }),
    {name:"TypeError",message:"history export event summary signature fields must be canonical"}
  );
});
