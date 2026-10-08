import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 553: audit download history snapshot validates count and summary integrity",()=>{
  const fn=ui.match(/function dimensionAuditDownloadAttemptHistoryAuditValid\(snapshot\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/String\(value\.schema\?\?""\)===dimensionAuditDownloadHistorySchema\(\)/);
  assert.match(fn,/Number\(value\.attempt_count\?\?-1\)===attempts\.length/);
  assert.match(fn,/Number\(summary\.total\?\?-1\)===attempts\.length/);
  assert.match(fn,/dimensionAuditDownloadAttemptHistorySummarySignature\(summary\)/);
});
