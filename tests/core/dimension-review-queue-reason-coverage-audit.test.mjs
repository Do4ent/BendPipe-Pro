import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 281: full review queue audit persists selection coverage per reason",()=>{
  const fn=ui.match(/function reviewQueueDimensionAuditSnapshot\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const reviewReasonSelection=\{\}/);
  assert.match(fn,/for\(const \[reason,count\] of Object\.entries\(reviewReasonCounts\)\.sort/);
  assert.match(fn,/selected_dimension_ids:reasonSelectedIds/);
  assert.match(fn,/unselected_dimension_ids:reasonUnselectedIds/);
  assert.match(fn,/selected_percent:count\?Math\.round\(reasonSelectedIds\.length\/count\*100\):0/);
  assert.match(fn,/review_reason_selection:reviewReasonSelection/);
});
