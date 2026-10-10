import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 257: Review queue audit can be downloaded with a deterministic audit filename",()=>{
  assert.match(ui,/function downloadReviewQueueDimensionAudits\(\)/);
  assert.match(ui,/dimension-review-queue-audit-/);
  assert.match(ui,/data-download-dimension-review-queue-audit/);
  assert.match(ui,/Download review queue audit JSON/);
  assert.match(ui,/addEventListener\("click",downloadReviewQueueDimensionAudits\)/);
});
