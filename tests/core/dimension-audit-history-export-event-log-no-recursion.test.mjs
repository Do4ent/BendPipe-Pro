import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 863: exporting the export-event log does not recursively record audit export events",()=>{
  const copy=ui.match(/async function copyDimensionAuditHistoryExportEvents\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  const download=ui.match(/function downloadDimensionAuditHistoryExportEvents\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  for(const fn of [copy,download]){
    assert.doesNotMatch(fn,/recordDimensionAuditDownloadHistoryExportEvent\(/);
    assert.doesNotMatch(fn,/recordDimensionAuditDownloadAttempt\(/);
    assert.doesNotMatch(fn,/downloadDimensionAuditJsonWithPermitEvidence\(/);
  }
  assert.match(download,/new Blob\(\[JSON\.stringify\(envelope,null,2\)\]/);
});
