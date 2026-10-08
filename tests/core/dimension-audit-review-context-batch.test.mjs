import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 456: Dimension audit batches reuse one review context state",()=>{
  assert.match(ui,/function dimensionAuditSnapshots\(items,reviewContextState=null\)/);
  assert.match(ui,/const sharedState=reviewContextState\?\?dimensionReviewContextState\(savedDimensions\(\),selectedDimensionAuditIds\(\)\)/);
  assert.match(ui,/return list\.map\(dimension=>dimensionRebindAuditSnapshot\(dimension,sharedState\)\)/);
  assert.match(ui,/function dimensionAuditReviewBundle\(items\)/);
  assert.match(ui,/review_context_summary:dimensionReviewContextSummary\(list,reviewContextState\)/);
  assert.match(ui,/dimensions:dimensionAuditSnapshots\(list,reviewContextState\)/);
});
