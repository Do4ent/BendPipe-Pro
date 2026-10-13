import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const properties=fs.readFileSync(path.join(root,"src","ui","properties-panel-runtime.js"),"utf8");

test("question 450: Dimension Properties prefers canonical per-reason review context",()=>{
  assert.match(properties,/reason_coverage:canonicalReviewContext\?\.reason_coverage\?\?reviewReasonCoverage/);
  assert.match(properties,/reason_progress:canonicalReviewContext\?\.reason_progress\?\?reviewReasonProgress/);
  assert.match(properties,/completed_reasons:canonicalReviewContext\?\.completed_reasons\?\?completedReviewReasons/);
  assert.match(properties,/pending_reasons:canonicalReviewContext\?\.pending_reasons\?\?pendingReviewReasons/);
  assert.match(properties,/\["Dimension reason coverage",reviewDisplay\.reason_coverage\]/);
  assert.match(properties,/\["Dimension reason progress",reviewDisplay\.reason_progress\]/);
  assert.match(properties,/\["Completed review reasons",reviewDisplay\.completed_reasons\]/);
  assert.match(properties,/\["Pending review reasons",reviewDisplay\.pending_reasons\]/);
});
