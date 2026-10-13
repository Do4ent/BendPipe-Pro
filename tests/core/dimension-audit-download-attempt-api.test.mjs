import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 531: last audit download attempt is exposed for QA",()=>{
  assert.match(ui,/function dimensionAuditDownloadLastAttempt\(\)/);
  assert.match(ui,/dimensionAuditDownloadLastAttempt/);
  assert.match(ui,/recordDimensionAuditDownloadAttempt/);
  assert.match(ui,/currentDimensionAuditDownloadProtocolSignature/);
});
