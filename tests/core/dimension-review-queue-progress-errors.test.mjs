import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 309: review queue audit exposes all progress errors",()=>{
  const fn=ui.match(/function reviewQueueDimensionAuditSnapshot\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/review_progress_errors:\[/);
  assert.match(fn,/REVIEW_REASON_COUNT_MISMATCH/);
  assert.match(fn,/REVIEW_REASON_LIST_MISMATCH/);
  assert.match(fn,/\.filter\(Boolean\)/);
});
