import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 879: export-event raw history is exposed only through a clone",()=>{
  const fn=ui.match(/function dimensionAuditDownloadHistoryExportEventListSnapshot\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/return clone\(dimensionAuditDownloadHistoryExportEventHistory\)/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventHistory:\(\)=>dimensionAuditDownloadHistoryExportEventListSnapshot\(\)/);
  assert.doesNotMatch(ui,/currentDimensionAuditDownloadHistoryExportEventHistory:\(\)=>dimensionAuditDownloadHistoryExportEventHistory\b/);
});
