import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 314: review progress audit validates emitted diagnostic codes",()=>{
  const fn=ui.match(/function reviewQueueDimensionAuditSnapshot\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/review_progress_error_codes_valid:/);
  assert.match(fn,/\.every\(code=>\["REVIEW_REASON_COUNT_MISMATCH","REVIEW_REASON_LIST_MISMATCH"\]\.includes\(code\)\)/);
});
