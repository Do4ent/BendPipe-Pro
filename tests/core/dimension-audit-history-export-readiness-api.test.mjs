import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 691: audit history export readiness is exposed for QA",()=>{
  assert.match(ui,/dimensionAuditDownloadHistoryExportReadiness/);
  assert.match(ui,/copyDimensionAuditDownloadHistory/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportReadiness:\(\)=>\{const history=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\);return dimensionAuditDownloadHistoryExportReadiness\(history\);\}/);
});
