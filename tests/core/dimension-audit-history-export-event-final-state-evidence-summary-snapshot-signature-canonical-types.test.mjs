import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotSignature,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1137: evidence summary snapshot signature rejects coercible non-canonical fields",()=>{
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
  const malformed={...snapshot,summary_signature:{toString:()=>snapshot.summary_signature}};
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotSignature(malformed),
    {name:"TypeError",message:"history export evidence summary snapshot signature fields must be canonical"}
  );
});

test("question 1161: evidence snapshot signature validator remains fail-closed if malformed input bypasses the builder",()=>{
  const malformed={
    schema:"TubeBender.DimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot.v1",
    summary_signature:{toString:()=>"s"},
    event_binding_signature:'["e"]',
    summary_valid:true,
    summary_signature_valid:true
  };
  assert.equal(
    dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotSignatureValid("forged",malformed),
    false
  );
});
