import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventSignature,
  dimensionAuditDownloadHistoryExportEventValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 843: every export event carries a non-empty audit code",()=>{
  assert.throws(()=>buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",outcome:"blocked",code:"",
    history_snapshot_signature:"history-a",
    generated_at:"2026-10-08T20:00:00.000Z"
  }),/requires code/);

  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",outcome:"blocked",code:"EMPTY",
    history_snapshot_signature:"history-a",
    generated_at:"2026-10-08T20:00:00.000Z"
  });
  const withoutCode={...event,code:""};
  withoutCode.signature=dimensionAuditDownloadHistoryExportEventSignature(withoutCode);
  assert.equal(dimensionAuditDownloadHistoryExportEventValid(withoutCode),false);
});
