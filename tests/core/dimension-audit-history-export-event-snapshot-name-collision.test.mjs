import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 839: raw export-event list and signed history snapshot have distinct runtime functions",()=>{
  const signed=[...ui.matchAll(/function dimensionAuditDownloadHistoryExportEventHistorySnapshot\(/g)];
  assert.equal(signed.length,1);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportEventListSnapshot\(\)/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportEventHistorySnapshot\(events=dimensionAuditDownloadHistoryExportEventListSnapshot\(\),generatedAt=new Date\(\)\)/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventHistory:\(\)=>dimensionAuditDownloadHistoryExportEventListSnapshot\(\)/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryLatestExportEvent:\(\)=>clone\(dimensionAuditDownloadHistoryExportEventListSnapshot\(\)\.at\(-1\)\?\?null\)/);
});
