import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const domain=fs.readFileSync(path.join(root,"src","domain","measurements","audit-download.mjs"),"utf8");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 915: export-event validators compare canonical signature directly",()=>{
  assert.match(domain,/&&value\.signature===dimensionAuditDownloadHistoryExportEventSignature\(value\);/);
  assert.match(ui,/&&value\.signature===dimensionAuditDownloadHistoryExportEventSignature\(value\);/);
  assert.doesNotMatch(domain,/String\(value\.signature\)===dimensionAuditDownloadHistoryExportEventSignature\(value\)/);
  assert.doesNotMatch(ui,/String\(value\.signature\)===dimensionAuditDownloadHistoryExportEventSignature\(value\)/);
});
