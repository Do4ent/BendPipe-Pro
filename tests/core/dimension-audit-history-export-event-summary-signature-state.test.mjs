import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventHistorySnapshot,
  dimensionAuditDownloadHistoryExportEventHistorySnapshotValid,
  dimensionAuditDownloadHistoryExportEventHistorySignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 869: event-history snapshot persists and enforces summary signature validity",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",outcome:"blocked",code:"EMPTY",
    history_snapshot_signature:"history-a",
    generated_at:"2026-10-08T20:00:00.000Z"
  });
  const snapshot=dimensionAuditDownloadHistoryExportEventHistorySnapshot(
    [event],"2026-10-08T20:01:00.000Z"
  );
  assert.equal(snapshot.summary_signature_valid,true);
  assert.equal(dimensionAuditDownloadHistoryExportEventHistorySnapshotValid(snapshot),true);

  const tampered={...snapshot,summary_signature_valid:false};
  tampered.signature=dimensionAuditDownloadHistoryExportEventHistorySignature(tampered);
  assert.equal(dimensionAuditDownloadHistoryExportEventHistorySnapshotValid(tampered),false);
});
