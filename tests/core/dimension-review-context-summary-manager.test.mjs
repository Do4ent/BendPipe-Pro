import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 463: Saved Dimensions shows global review context summary",()=>{
  assert.match(ui,/const managerReviewContextSummary=dimensionReviewContextSummary\(items\)/);
  assert.match(ui,/data-review-context-action-required="'\+managerReviewContextSummary\.action_required\+'"/);
  assert.match(ui,/data-review-context-ready="'\+\(managerReviewContextSummary\.by_health\?\.ready\?\?0\)\+'"/);
  assert.match(ui,/data-review-context-pending="'\+\(managerReviewContextSummary\.by_health\?\.pending\?\?0\)\+'"/);
  assert.match(ui,/data-review-context-diagnostics-error="'\+\(managerReviewContextSummary\.by_health\?\.\["diagnostics-error"\]\?\?0\)\+'"/);
  assert.match(ui,/data-review-context-summary-signature="'\+esc\(managerReviewContextSummary\.signature\)\+'"/);
});
