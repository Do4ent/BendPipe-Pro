import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const properties=fs.readFileSync(path.join(root,"src","ui","properties-panel-runtime.js"),"utf8");
test("question 436: Dimension Properties separates completed and pending review reasons",()=>{
  assert.match(properties,/const completedReviewReasons=reviewReasons\.filter\(reason=>reviewReasonCoverage\[String\(reason\)\]==="complete"\)/);
  assert.match(properties,/const pendingReviewReasons=reviewReasons\.filter\(reason=>reviewReasonCoverage\[String\(reason\)\]!=="complete"\)/);
  assert.match(properties,/completed_reasons:canonicalReviewContext\?\.completed_reasons\?\?completedReviewReasons/);
  assert.match(properties,/pending_reasons:canonicalReviewContext\?\.pending_reasons\?\?pendingReviewReasons/);
  assert.match(properties,/\["Completed review reasons",reviewDisplay\.completed_reasons\]/);
  assert.match(properties,/\["Pending review reasons",reviewDisplay\.pending_reasons\]/);
});
