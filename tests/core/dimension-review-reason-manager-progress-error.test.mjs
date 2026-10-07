import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 307: Saved Dimensions shows review progress diagnostic code",()=>{
  assert.match(ui,/const reviewReasonProgressError=/);
  assert.match(ui,/REVIEW_REASON_COUNT_MISMATCH/);
  assert.match(ui,/REVIEW_REASON_LIST_MISMATCH/);
  assert.match(ui,/reviewReasonProgressError/);
});
