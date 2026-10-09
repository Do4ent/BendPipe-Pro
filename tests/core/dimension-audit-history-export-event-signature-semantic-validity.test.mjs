import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventSignature,
  dimensionAuditDownloadHistoryExportEventSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1236: export-event signature validator rejects self-signed semantically impossible events",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",
    outcome:"blocked",
    code:"EMPTY",
    history_snapshot_signature:"h",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const impossible={...event,outcome:"downloaded"};
  const forged=dimensionAuditDownloadHistoryExportEventSignature(impossible);
  assert.equal(dimensionAuditDownloadHistoryExportEventSignatureValid(forged,impossible),false);
});
