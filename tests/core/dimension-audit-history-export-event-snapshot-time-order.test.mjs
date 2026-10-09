import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventHistorySnapshot,
  dimensionAuditDownloadHistoryExportEventHistorySnapshotValid,
  dimensionAuditDownloadHistoryExportEventHistorySignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 845: export event history snapshot cannot predate contained events",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",outcome:"blocked",code:"EMPTY",
    history_snapshot_signature:"history-a",
    generated_at:"2026-10-08T20:01:00.000Z"
  });
  assert.throws(()=>dimensionAuditDownloadHistoryExportEventHistorySnapshot(
    [event],"2026-10-08T20:00:59.999Z"
  ),/cannot predate contained events/);

  const snapshot=dimensionAuditDownloadHistoryExportEventHistorySnapshot(
    [event],"2026-10-08T20:01:00.000Z"
  );
  assert.equal(dimensionAuditDownloadHistoryExportEventHistorySnapshotValid(snapshot),true);

  const impossible={...snapshot,generated_at:"2026-10-08T20:00:59.999Z"};
  impossible.signature=dimensionAuditDownloadHistoryExportEventHistorySignature(impossible);
  assert.equal(dimensionAuditDownloadHistoryExportEventHistorySnapshotValid(impossible),false);
});
