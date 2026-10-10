import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1160: evidence summary snapshot signature builder rejects coercible fields",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",
    outcome:"blocked",
    code:"EMPTY",
    history_snapshot_signature:"h",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const events=[event];
  const summary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary(events);
  const snapshot=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot(summary,events);
  assert.doesNotThrow(()=>dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotSignature(snapshot));
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotSignature({
      ...snapshot,
      summary_signature:{toString:()=>snapshot.summary_signature}
    }),
    {name:"TypeError",message:"history export evidence summary snapshot signature fields must be canonical"}
  );
});
