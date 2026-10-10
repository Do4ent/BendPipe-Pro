import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 537: audit download attempt history can be cleared",()=>{
  const fn=ui.match(/function clearDimensionAuditDownloadAttemptHistory\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const count=dimensionAuditDownloadAttemptHistory\.length/);
  assert.match(fn,/dimensionAuditDownloadAttemptHistory\.splice\(0,dimensionAuditDownloadAttemptHistory\.length\)/);
  assert.match(fn,/return count/);
});
