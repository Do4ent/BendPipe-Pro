import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 274: active review reason shows selection coverage percent",()=>{
  assert.match(ui,/const selectedReviewReasonPercent=activeReviewReasonIds\.length\?Math\.round\(selectedReviewReasonCount\/activeReviewReasonIds\.length\*100\):0/);
  assert.match(ui,/coverage '\+selectedReviewReasonPercent\+'%/);
});
