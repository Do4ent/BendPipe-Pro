import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 456: Dimension audit batches reuse one review context state",()=>{
  assert.match(ui,/function dimensionAuditSnapshots\(items\)/);
  assert.match(ui,/const reviewContextState=dimensionReviewContextState\(savedDimensions\(\),selectedDimensionAuditIds\(\)\)/);
  assert.match(ui,/return list\.map\(dimension=>dimensionRebindAuditSnapshot\(dimension,reviewContextState\)\)/);
  assert.equal((ui.match(/dimensions:dimensionAuditSnapshots\(items\)/g)||[]).length,5);
  assert.doesNotMatch(ui,/dimensions:items\.map\(dimension=>dimensionRebindAuditSnapshot\(dimension\)\)/);
});
