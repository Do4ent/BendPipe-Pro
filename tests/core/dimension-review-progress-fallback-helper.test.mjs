import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 374: review progress UI fallback is isolated behind a helper",()=>{
  assert.match(ui,/function dimensionReviewProgressFallback\(reviewItems,selectedIds\)/);
  const fn=ui.match(/function dimensionReviewProgress\(items=savedDimensions\(\),selectedIds=selectedDimensionAuditIds\(\)\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/return dimensionReviewProgressFallback\(reviewItems,selectedIds\)/);
});
