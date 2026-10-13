import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 298: Saved Dimensions shows completed review reason names",()=>{
  assert.match(ui,/const reviewReasonCompletedNames=reviewReasonEntries\.filter/);
  assert.match(ui,/reviewReasonCompletedNames\.join\(', '\)/);
  assert.match(ui,/completed '\+reviewReasonCoverageCounts\.complete/);
});
