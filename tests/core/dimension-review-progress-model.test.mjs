import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 321: shared Dimension review progress model exists",()=>{
  assert.match(ui,/function dimensionReviewProgress\(items=savedDimensions\(\),selectedIds=selectedDimensionAuditIds\(\)\)/);
  assert.match(ui,/reason_counts:reasonCounts/);
  assert.match(ui,/reason_selection:reasonSelection/);
  assert.match(ui,/completion_state:count===0\?"empty":pendingCount===0\?"complete":"pending"/);
  assert.match(ui,/status:count===0\?"empty":errors\.length===0\?"ok":"error"/);
});
