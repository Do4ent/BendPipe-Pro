import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 535: last audit download attempt signature is exposed",()=>{
  assert.match(ui,/function dimensionAuditDownloadLastAttemptSignature\(\)/);
  assert.match(ui,/return String\(lastDimensionAuditDownloadAttempt\?\.signature\?\?""\)/);
  assert.match(ui,/dimensionAuditDownloadLastAttempt,dimensionAuditDownloadLastAttemptSignature,clearDimensionAuditDownloadLastAttempt/);
});
