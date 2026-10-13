import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventSummary,
  dimensionAuditDownloadHistoryExportEventSummaryValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 909: export-event summary rejects string-coercible non-string fields",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",outcome:"blocked",code:"EMPTY",
    history_snapshot_signature:"h1",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const summary=dimensionAuditDownloadHistoryExportEventSummary([event]);
  for(const field of ["schema","latest_signature","latest_outcome","latest_action","latest_code","signature"]){
    const tampered={...summary,[field]:new String(summary[field])};
    assert.equal(dimensionAuditDownloadHistoryExportEventSummaryValid(tampered,[event]),false,field);
  }
});
