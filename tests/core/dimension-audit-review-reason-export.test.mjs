import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 262: active review reason is derived from the audit queue state",()=>{
  assert.match(ui,/function activeDimensionReviewReason\(\)/);
  assert.match(ui,/dimensionManagerFilter!=="needs-review"\|\|dimensionManagerSort!=="audit"/);
  assert.match(ui,/dimensionAuditReviewReasons\(dimension\)/);
});

test("question 262: audit view snapshots persist semantic review reason",()=>{
  assert.match(ui,/review_reason:activeDimensionReviewReason\(\)/);
  assert.match(ui,/visibleDimensionAuditSnapshot,copyVisibleDimensionAudits,activeDimensionReviewReason,filteredDimensionManagerItems/);
});
