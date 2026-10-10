import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1184: export-event signature builder rejects coercible fields",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",
    outcome:"blocked",
    code:"EMPTY",
    history_snapshot_signature:"h",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  assert.doesNotThrow(()=>dimensionAuditDownloadHistoryExportEventSignature(event));
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportEventSignature({
      ...event,
      code:{toString:()=>event.code}
    }),
    {name:"TypeError",message:"history export event signature fields must be canonical"}
  );
});
