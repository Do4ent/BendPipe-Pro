import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const properties=fs.readFileSync(path.join(root,"src","ui","properties-panel-runtime.js"),"utf8");

test("question 449: Dimension Properties prefers canonical review context values",()=>{
  assert.match(properties,/const reviewDisplay=\{/);
  assert.match(properties,/selected_in_audit:canonicalReviewContext\?\.selected_in_audit\?\?selectedInAudit/);
  assert.match(properties,/state:canonicalReviewContext\?\.state\?\?dimensionReviewState/);
  assert.match(properties,/health:canonicalReviewContext\?\.health\?\?reviewContextHealth/);
  assert.match(properties,/action_required:canonicalReviewContext\?\.action_required\?\?reviewActionRequired/);
  assert.match(properties,/complete_percent:canonicalReviewContext\?\.complete_percent\?\?dimensionReviewCompletePercent/);
  assert.match(properties,/blockers:canonicalReviewContext\?\.blockers\?\?reviewBlockers/);
  assert.match(properties,/\["Selected in audit",reviewDisplay\.selected_in_audit\]/);
  assert.match(properties,/\["Review blockers",reviewDisplay\.blockers\]/);
});
