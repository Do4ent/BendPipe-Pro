import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignature,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignatureValid,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1078: evidence summary snapshot validation fails closed on non-array events",()=>{
  const events=[];
  const summary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary(events);
  const snapshot=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot(summary,events);
  assert.equal(dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotValid(snapshot,null),false);
  assert.equal(dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotValid(snapshot,"events"),false);
});

test("question 1079: evidence summary signature validation fails closed on non-array events",()=>{
  const events=[];
  const summary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary(events);
  const signature=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignature(summary);
  assert.equal(dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignatureValid(signature,summary,null),false);
  assert.equal(dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignatureValid(signature,summary,"events"),false);
});
