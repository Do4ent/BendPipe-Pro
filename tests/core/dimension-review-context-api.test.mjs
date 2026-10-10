import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");
test("question 447: Dimension review context is exposed through Measurements API",()=>{
  assert.match(ui,/canonicalDimensionReviewProgress/);
  assert.match(ui,/dimensionReviewContextState/);
  assert.match(ui,/dimensionReviewContext/);
  assert.match(ui,/dimensionReviewContextSignature/);
  assert.match(ui,/dimensionReviewProgressDiagnostics/);
});
