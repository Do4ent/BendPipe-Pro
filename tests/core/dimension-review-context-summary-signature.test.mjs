import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 460: Dimension review context summary is versioned and signed deterministically",()=>{
  assert.match(ui,/function dimensionReviewContextSummarySignature\(summary=\{\}\)/);
  assert.match(ui,/schema:String\(summary\?\.schema\?\?"TubeBender\.DimensionReviewContextSummary\.v1"\)/);
  assert.match(ui,/schema:"TubeBender\.DimensionReviewContextSummary\.v1"/);
  assert.match(ui,/return \{\.\.\.summary,signature:dimensionReviewContextSummarySignature\(summary\)\}/);
});
