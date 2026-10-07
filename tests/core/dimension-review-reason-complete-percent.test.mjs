import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 286: review queue audit exposes complete review reason percent",()=>{
  assert.match(ui,/const reviewReasonCount=Object\.keys\(reviewReasonCounts\)\.length/);
  assert.match(ui,/const reviewReasonCompletePercent=reviewReasonCount\?Math\.round\(reviewReasonCoverageSummary\.complete\/reviewReasonCount\*100\):0/);
  assert.match(ui,/review_reason_complete_percent:reviewReasonCompletePercent/);
});
