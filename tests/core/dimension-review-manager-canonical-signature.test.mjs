import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 350: manager uses canonical domain review progress signature",()=>{
  assert.match(ui,/const managerReviewProgressRuntime=dimensionReviewProgressRuntimeState\(items,selectedDimensionAuditIds\(\)\)/);
  assert.match(ui,/const canonicalManagerReviewProgressSignature=managerReviewProgressRuntime\.signature/);
  assert.match(ui,/const canonicalManagerReviewProgressSource=managerReviewProgressRuntime\.source/);
  assert.match(ui,/data-review-progress-source="'\+esc\(canonicalManagerReviewProgressSource\)\+'"/);
  assert.match(ui,/data-review-progress-signature="'\+esc\(canonicalManagerReviewProgressSignature\)\+'"/);
});
