import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignature,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1126: event binding signature validator accepts exact ordered events and fails closed on malformed/reordered input",()=>{
  const e1=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",outcome:"blocked",code:"EMPTY",history_snapshot_signature:"h1",generated_at:"2026-10-09T00:00:00.000Z"
  });
  const e2=buildDimensionAuditDownloadHistoryExportEvent({
    action:"download",outcome:"blocked",code:"EMPTY",history_snapshot_signature:"h2",generated_at:"2026-10-09T00:00:01.000Z"
  });
  const events=[e1,e2];
  const signature=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignature(events);
  assert.equal(dimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignatureValid(signature,events),true);
  assert.equal(dimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignatureValid(signature,[e2,e1]),false);
  assert.equal(dimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignatureValid(signature,null),false);
});
