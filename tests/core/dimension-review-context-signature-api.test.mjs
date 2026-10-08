import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");
const properties=fs.readFileSync(path.join(root,"src","ui","properties-panel-runtime.js"),"utf8");
test("question 452: Dimension review context signature is exposed and shown in Properties",()=>{
  assert.match(ui,/dimensionReviewContextSignature/);
  assert.match(ui,/dimensionReviewContextSummarySignature/);
  assert.match(properties,/\["Review context signature",canonicalReviewContext\?\.signature\?\?null\]/);
});
