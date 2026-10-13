import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 594: UI audit download attempt recording delegates to domain builder",()=>{
  const fn=ui.match(/function recordDimensionAuditDownloadAttempt\(status,preflight,error=null\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/auditDownloadDomain\?\.buildDimensionAuditDownloadAttempt/);
  assert.match(fn,/clone\(auditDownloadDomain\.buildDimensionAuditDownloadAttempt\(input\)\)/);
  assert.match(fn,/generated_at:new Date\(\)\.toISOString\(\)/);
  assert.match(fn,/dimensionAuditDownloadAttemptHistory\.push\(attempt\)/);
});
