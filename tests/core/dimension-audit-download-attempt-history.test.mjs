import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 536: audit download attempt history is retained for QA",()=>{
  assert.match(ui,/const dimensionAuditDownloadAttemptHistory=\[\]/);
  assert.match(ui,/function dimensionAuditDownloadAttemptHistorySnapshot\(\)/);
  assert.match(ui,/return clone\(dimensionAuditDownloadAttemptHistory\)/);
  assert.match(ui,/dimensionAuditDownloadAttemptHistorySnapshot/);
});
