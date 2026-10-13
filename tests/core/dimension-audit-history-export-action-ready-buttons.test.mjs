import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 790: history copy and download buttons use strongest action readiness",()=>{
  assert.match(ui,/data-copy-dimension-audit-download-history '\+\(auditDownloadHistoryExportActionReady\?'':'disabled'\)\+'/);
  assert.match(ui,/data-download-dimension-audit-download-history '\+\(auditDownloadHistoryExportActionReady\?'':'disabled'\)\+'/);
});
