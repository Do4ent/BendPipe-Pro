import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1181: final-state evidence summary signature builder rejects coercible fields",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",
    outcome:"blocked",
    code:"EMPTY",
    history_snapshot_signature:"h",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const summary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary([event]);
  assert.doesNotThrow(()=>dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignature(summary));
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignature({...summary,total:"1"}),
    {name:"TypeError",message:"history export final-state evidence summary signature fields must be canonical"}
  );
});
