import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventSignature,
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
    tampered.signature=dimensionAuditDownloadHistoryExportEventSignature(tampered);
    assert.equal(dimensionAuditDownloadHistoryExportEventValid(tampered),false,field);
  }
});
