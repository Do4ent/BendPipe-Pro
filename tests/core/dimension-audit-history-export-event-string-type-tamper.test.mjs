import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventSignature,
  dimensionAuditDownloadHistoryExportEventSignatureValid,
  dimensionAuditDownloadHistoryExportEventValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 907: export event rejects string-coercible non-string fields",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",outcome:"blocked",code:"EMPTY",
    history_snapshot_signature:"h1",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  for(const [field,value] of [
    ["action",new String("copy")],
    ["outcome",new String("blocked")],
    ["code",new String("EMPTY")],
    ["history_snapshot_signature",new String("h1")],
    ["generated_at",new String("2026-10-09T00:00:00.000Z")]
  ]){
    const tampered={...event,[field]:value};
    assert.throws(
      ()=>dimensionAuditDownloadHistoryExportEventSignature(tampered),
      {name:"TypeError",message:"history export event signature fields must be canonical"},
      field
    );
    assert.equal(dimensionAuditDownloadHistoryExportEventValid(tampered),false,field);
  }
});

test("question 1188: export-event signature validator remains fail-closed for coercible fields that bypass the strict builder",()=>{
  const malformed={
    schema:"TubeBender.DimensionAuditDownloadHistoryExportEvent.v1",
    action:new String("copy"),
    outcome:"blocked",
    code:"EMPTY",
    history_snapshot_signature:"h1",
    action_permit_signature:"",
    action_permit_snapshot_signature:"",
    error:null,
    generated_at:"2026-10-09T00:00:00.000Z"
  };
  assert.equal(dimensionAuditDownloadHistoryExportEventSignatureValid("forged",malformed),false);
});
