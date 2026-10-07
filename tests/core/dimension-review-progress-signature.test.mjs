import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 330: review progress audit has deterministic signature",()=>{
  assert.match(ui,/function dimensionReviewProgressSignature\(progress\)/);
  assert.match(ui,/review_progress_signature:dimensionReviewProgressSignature\(sharedReviewProgress\)/);
  assert.doesNotMatch(ui,/dimensionReviewProgressSignature[\s\S]*?generated_at/);
});
