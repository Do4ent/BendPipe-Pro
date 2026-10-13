import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventHistorySnapshot,
  dimensionAuditDownloadHistoryExportEventHistorySignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1166: export-event history signature builder rejects coercible nested fields",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",
    outcome:"blocked",
    code:"EMPTY",
    history_snapshot_signature:"h",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const snapshot=dimensionAuditDownloadHistoryExportEventHistorySnapshot(
    [event],
    "2026-10-09T00:00:01.000Z"
  );
  assert.doesNotThrow(()=>dimensionAuditDownloadHistoryExportEventHistorySignature(snapshot));
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportEventHistorySignature({
      ...snapshot,
      event_count:{valueOf:()=>snapshot.event_count}
    }),
    {name:"TypeError",message:"history export event history signature fields must be canonical"}
  );
});
