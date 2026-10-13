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
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportEventSignature(malformed),
    {name:"TypeError",message:"history export event signature fields must be canonical"}
  );
});

test("question 1185: export-event signature validator remains fail-closed if malformed input bypasses the strict builder",()=>{
  const malformed={
    schema:"TubeBender.DimensionAuditDownloadHistoryExportEvent.v1",
    action:"copy",
    outcome:"blocked",
    code:{toString:()=>"EMPTY"},
    history_snapshot_signature:"h",
    action_permit_signature:"",
    action_permit_snapshot_signature:"",
    error:null,
    generated_at:"2026-10-09T00:00:00.000Z"
  };
  assert.equal(dimensionAuditDownloadHistoryExportEventSignatureValid("forged",malformed),false);
});
