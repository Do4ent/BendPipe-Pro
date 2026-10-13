import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 533: every audit download attempt carries a signature",()=>{
  const fn=ui.match(/function recordDimensionAuditDownloadAttempt\(status,preflight,error=null\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const base=\{/);
  assert.match(fn,/signature:dimensionAuditDownloadAttemptSignature\(base\)/);
  assert.match(fn,/generated_at:new Date\(\)\.toISOString\(\)/);
});
