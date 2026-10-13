import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 276: active review reason shows unselected count",()=>{
  assert.match(ui,/Active reason: /);
  assert.match(ui,/unselected '\+Math\.max\(0,activeReviewReasonIds\.length-selectedReviewReasonCount\)/);
  assert.match(ui,/data-selection-coverage=/);
});
