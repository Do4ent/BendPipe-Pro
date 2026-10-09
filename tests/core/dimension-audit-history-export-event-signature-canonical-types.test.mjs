import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventSignature,
  dimensionAuditDownloadHistoryExportEventSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1135: export-event signature validation rejects coercible non-canonical signed fields",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",
    outcome:"blocked",
    code:"EMPTY",
    history_snapshot_signature:"h",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const malformed={...event,code:{toString:()=>event.code}};
  const forgedSignature=dimensionAuditDownloadHistoryExportEventSignature(malformed);
  assert.equal(dimensionAuditDownloadHistoryExportEventSignatureValid(forgedSignature,malformed),false);
});
