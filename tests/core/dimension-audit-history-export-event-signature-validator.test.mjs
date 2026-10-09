import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventSignature,
  dimensionAuditDownloadHistoryExportEventSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1124: export event signature validator accepts canonical event and rejects malformed/tampered input",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",
    outcome:"blocked",
    code:"EMPTY",
    history_snapshot_signature:"h",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const signature=dimensionAuditDownloadHistoryExportEventSignature(event);
  assert.equal(dimensionAuditDownloadHistoryExportEventSignatureValid(signature,event),true);
  assert.equal(dimensionAuditDownloadHistoryExportEventSignatureValid("",event),false);
  assert.equal(dimensionAuditDownloadHistoryExportEventSignatureValid({toString:()=>signature},event),false);
  assert.equal(dimensionAuditDownloadHistoryExportEventSignatureValid(signature,{...event,code:"tampered"}),false);
});
