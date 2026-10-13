import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 354: canonical review progress helper is exposed for QA",()=>{
  assert.match(ui,/domainDimensionReviewProgress/);
  assert.match(ui,/canonicalDimensionReviewProgress/);
  assert.match(ui,/dimensionReviewProgressSignature/);
  assert.match(ui,/currentCanonicalReviewProgress:\(\)=>canonicalDimensionReviewProgress\(\)/);
});
