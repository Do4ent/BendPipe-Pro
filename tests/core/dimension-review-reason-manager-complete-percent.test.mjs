import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 287: Saved Dimensions shows review reason completion percent",()=>{
  assert.match(ui,/const reviewReasonCompletePercent=reviewReasonEntries\.length/);
  assert.match(ui,/reviewReasonCoverageCounts\.complete\/reviewReasonEntries\.length\*100/);
  assert.match(ui,/complete '\+reviewReasonCompletePercent\+'%'/);
});
