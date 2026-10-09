import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventSignature,
  dimensionAuditDownloadHistoryExportEventHistorySnapshot,
  dimensionAuditDownloadHistoryExportEventHistorySnapshotValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 855: diagnostic history snapshot may contain invalid event but can never validate",()=>{
  const valid=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",outcome:"blocked",code:"EMPTY",
    history_snapshot_signature:"history-a",
    generated_at:"2026-10-08T20:00:00.000Z"
  });
  const invalid={...valid,code:"READY"};
  invalid.signature=dimensionAuditDownloadHistoryExportEventSignature(invalid);

  const snapshot=dimensionAuditDownloadHistoryExportEventHistorySnapshot(
    [invalid],"2026-10-08T20:01:00.000Z"
  );
  assert.equal(snapshot.events_valid,false);
  assert.equal(snapshot.summary.valid,0);
  assert.equal(snapshot.summary.invalid,1);
  assert.equal(snapshot.summary_valid,true);
  assert.equal(dimensionAuditDownloadHistoryExportEventHistorySnapshotValid(snapshot),false);
});
