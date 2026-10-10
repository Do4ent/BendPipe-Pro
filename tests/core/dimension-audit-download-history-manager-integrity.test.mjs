import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 556: Saved Dimensions exposes audit download history integrity metadata",()=>{
  assert.match(ui,/const auditDownloadHistorySnapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\)/);
  assert.match(ui,/data-snapshot-valid="'\+\(auditDownloadHistorySnapshot\.valid\?'1':'0'\)\+'"/);
  assert.match(ui,/data-snapshot-signature="'\+esc\(auditDownloadHistorySnapshot\.snapshot_signature\)\+'"/);
});
