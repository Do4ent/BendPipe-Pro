import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 269: active review reason shows total and selected counts",()=>{
  assert.match(ui,/const activeReviewReasonIds=activeReviewReason/);
  assert.match(ui,/const selectedReviewReasonCount=activeReviewReasonIds.filter/);
  assert.match(ui,/data-dimension-review-reason-active/);
  assert.match(ui,/Active reason: /);
});

test("question 269: reason selection actions reflect current selection state",()=>{
  assert.match(ui,/selectedReviewReasonCount===activeReviewReasonIds.length?'disabled':''/);
  assert.match(ui,/Remove reason queue ('+selectedReviewReasonCount+')/);
});
