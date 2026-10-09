import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventHistorySnapshot,
  dimensionAuditDownloadHistoryExportEventHistorySignature,
  dimensionAuditDownloadHistoryExportEventHistorySignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1238: export-event history signature validator rejects self-signed inconsistent event_count",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",outcome:"blocked",code:"EMPTY",history_snapshot_signature:"h",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const snapshot=dimensionAuditDownloadHistoryExportEventHistorySnapshot([event],"2026-10-09T00:00:01.000Z");
  const impossible={...snapshot,event_count:2};
  const forged=dimensionAuditDownloadHistoryExportEventHistorySignature(impossible);
  assert.equal(dimensionAuditDownloadHistoryExportEventHistorySignatureValid(forged,impossible),false);
});
