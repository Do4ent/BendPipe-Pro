import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 739: manager exposes history export gate validity metadata",()=>{
  assert.match(ui,/const auditDownloadHistoryExportGateValid=dimensionAuditDownloadHistoryExportGateValid\(auditDownloadHistoryExportGate\)/);
  assert.match(ui,/data-history-export-gate-valid="'\+\(auditDownloadHistoryExportGateValid\?'1':'0'\)\+'"/);
});
