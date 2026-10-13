import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 538: audit download attempt history is bounded",()=>{
  assert.match(ui,/const DIMENSION_AUDIT_DOWNLOAD_ATTEMPT_HISTORY_LIMIT=20/);
  const fn=ui.match(/function recordDimensionAuditDownloadAttempt\(status,preflight,error=null\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/dimensionAuditDownloadAttemptHistory\.push\(attempt\)/);
  assert.match(fn,/while\(dimensionAuditDownloadAttemptHistory\.length>DIMENSION_AUDIT_DOWNLOAD_ATTEMPT_HISTORY_LIMIT\)dimensionAuditDownloadAttemptHistory\.shift\(\)/);
});
