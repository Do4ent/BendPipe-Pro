import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 530: audit download records blocked downloaded and failed outcomes",()=>{
  const fn=ui.match(/function downloadDimensionAuditJson\(filename,snapshot\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/recordDimensionAuditDownloadAttempt\("blocked",preflight\)/);
  assert.match(fn,/recordDimensionAuditDownloadAttempt\("downloaded",preflight\)/);
  assert.match(fn,/recordDimensionAuditDownloadAttempt\("failed",preflight,error\)/);
});
