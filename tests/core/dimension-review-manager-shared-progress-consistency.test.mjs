import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 323: manager cross-checks review progress against shared model",()=>{
  assert.match(ui,/const sharedManagerReviewProgress=dimensionReviewProgress\(items,selectedDimensionAuditIds\(\)\)/);
  assert.match(ui,/const sharedManagerReviewProgressConsistent=/);
  assert.match(ui,/model '\+\(sharedManagerReviewProgressConsistent\?'aligned':'diverged'\)/);
});
