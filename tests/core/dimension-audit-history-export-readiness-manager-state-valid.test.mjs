import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 710: manager exposes readiness state and snapshot validity separately",()=>{
  assert.match(ui,/data-history-export-readiness-state-valid="'\+\(auditDownloadHistoryExportReadinessSnapshot\.state_valid\?'1':'0'\)\+'"/);
  assert.match(ui,/data-history-export-state-valid="'\+\(auditDownloadHistoryExportReadinessSnapshotValid\?'1':'0'\)\+'"/);
});
