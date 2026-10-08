import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 546: audit download attempt history has a versioned audit snapshot",()=>{
  const fn=ui.match(/function dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/schema:"TubeBender\.DimensionAuditDownloadHistory\.v1"/);
  assert.match(fn,/summary_signature:dimensionAuditDownloadAttemptHistorySummarySignature\(summary\)/);
  assert.match(fn,/attempt_count:attempts\.length/);
  assert.match(fn,/attempts/);
});
