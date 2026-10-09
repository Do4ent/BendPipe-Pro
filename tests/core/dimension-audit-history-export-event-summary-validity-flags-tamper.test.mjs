import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventHistorySnapshot,
  dimensionAuditDownloadHistoryExportEventHistorySnapshotValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 900: history snapshot rejects tampered summary validity flags",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"download",outcome:"blocked",code:"EMPTY",
    history_snapshot_signature:"h1",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const snapshot=dimensionAuditDownloadHistoryExportEventHistorySnapshot([event],"2026-10-09T00:00:01.000Z");
  assert.equal(dimensionAuditDownloadHistoryExportEventHistorySnapshotValid({...snapshot,summary_valid:false}),false);
  assert.equal(dimensionAuditDownloadHistoryExportEventHistorySnapshotValid({...snapshot,summary_signature_valid:false}),false);
});
