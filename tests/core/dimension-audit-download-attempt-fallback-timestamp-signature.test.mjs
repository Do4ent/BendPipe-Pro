import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 671: UI fallback signs generated_at inside audit attempt signature",()=>{
  const fn=ui.match(/function recordDimensionAuditDownloadAttempt\(status,preflight,error=null\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const base=\{schema:"TubeBender\.DimensionAuditDownloadAttempt\.v1",\.\.\.input\}/);
  assert.match(fn,/return \{\.\.\.base,signature:dimensionAuditDownloadAttemptSignature\(base\)\}/);
  assert.doesNotMatch(fn,/delete base\.generated_at/);
});
