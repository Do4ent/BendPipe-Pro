import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 364: UI review progress calculation delegates to domain model",()=>{
  const fn=ui.match(/function dimensionReviewProgress\(items=savedDimensions\(\),selectedIds=selectedDimensionAuditIds\(\)\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/reviewProgressDomain\?\.buildReviewProgress/);
  assert.match(fn,/reviewProgressDomain\.buildReviewProgress\(\{/);
  assert.match(fn,/return \{\.\.\.progress,review_items:reviewItems\}/);
});
