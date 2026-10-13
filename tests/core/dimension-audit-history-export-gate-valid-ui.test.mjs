import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 738: history export gate semantic validation is exposed through runtime adapter",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryExportGateValid\(/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportGateValid/);
  assert.match(ui,/return dimensionAuditDownloadHistoryExportGateValid\(value\)/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportGateValid:\(\)=>dimensionAuditDownloadHistoryExportGateValid\(\)/);
});
