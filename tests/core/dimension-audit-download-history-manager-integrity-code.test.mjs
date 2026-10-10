import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 578: Saved Dimensions exposes audit history integrity code and error count",()=>{
  assert.match(ui,/data-integrity-code="'\+esc\(auditDownloadHistorySnapshot\.integrity\?\.code\?\?'\'\)\+'"/);
  assert.match(ui,/data-integrity-errors="'\+\(auditDownloadHistorySnapshot\.integrity\?\.errors\?\.length\?\?0\)\+'"/);
  assert.match(ui,/integrity '\+esc\(auditDownloadHistorySnapshot\.integrity\?\.code\?\?'\'\)/);
});
