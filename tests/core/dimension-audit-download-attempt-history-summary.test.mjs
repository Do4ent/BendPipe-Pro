import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 539: audit download attempt history exposes compact counts",()=>{
  const fn=ui.match(/function dimensionAuditDownloadAttemptHistorySummary\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/schema:"TubeBender\.DimensionAuditDownloadAttemptHistorySummary\.v1"/);
  assert.match(fn,/total:dimensionAuditDownloadAttemptHistory\.length/);
  assert.match(fn,/blocked:counts\.blocked/);
  assert.match(fn,/downloaded:counts\.downloaded/);
  assert.match(fn,/failed:counts\.failed/);
});
