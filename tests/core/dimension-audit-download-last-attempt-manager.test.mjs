import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 544: Saved Dimensions shows last audit download attempt",()=>{
  assert.match(ui,/const lastAuditDownloadAttempt=dimensionAuditDownloadLastAttempt\(\)/);
  assert.match(ui,/data-dimension-audit-download-last-attempt/);
  assert.match(ui,/data-status="'\+esc\(lastAuditDownloadAttempt\.status\)\+'"/);
  assert.match(ui,/Last audit download: '\+esc\(lastAuditDownloadAttempt\.status\)/);
});
