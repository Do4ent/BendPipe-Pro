import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 332: review progress status and signature are machine-readable in manager",()=>{
  assert.match(ui,/const managerReviewProgressRuntime=dimensionReviewProgressRuntimeState\(items,selectedDimensionAuditIds\(\)\)/);
  assert.match(ui,/data-review-progress-status="'\+esc\(reviewReasonProgressStatus\)\+'"/);
  assert.match(ui,/data-review-progress-signature="'\+esc\(canonicalManagerReviewProgressSignature\)\+'"/);
});
