import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 542: Saved Dimensions shows audit download history summary",()=>{
  assert.match(ui,/const auditDownloadHistorySummary=dimensionAuditDownloadAttemptHistorySummary\(\)/);
  assert.match(ui,/const auditDownloadHistorySummarySignature=dimensionAuditDownloadAttemptHistorySummarySignature\(auditDownloadHistorySummary\)/);
  assert.match(ui,/data-dimension-audit-download-history/);
  assert.match(ui,/Audit downloads: '\+auditDownloadHistorySummary\.total/);
  assert.match(ui,/data-signature="'\+esc\(auditDownloadHistorySummarySignature\)\+'"/);
});
