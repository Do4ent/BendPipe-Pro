import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventHistorySnapshot,
  dimensionAuditDownloadHistoryExportEventHistorySignature,
  dimensionAuditDownloadHistoryExportEventHistorySignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 914: history signature validation rejects boxed and empty strings",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"download",outcome:"blocked",code:"EMPTY",
    history_snapshot_signature:"h1",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const snapshot=dimensionAuditDownloadHistoryExportEventHistorySnapshot([event],"2026-10-09T00:00:01.000Z");
  const signature=dimensionAuditDownloadHistoryExportEventHistorySignature(snapshot);
  assert.equal(dimensionAuditDownloadHistoryExportEventHistorySignatureValid(signature,snapshot),true);
  assert.equal(dimensionAuditDownloadHistoryExportEventHistorySignatureValid(new String(signature),snapshot),false);
  assert.equal(dimensionAuditDownloadHistoryExportEventHistorySignatureValid("",snapshot),false);
});
