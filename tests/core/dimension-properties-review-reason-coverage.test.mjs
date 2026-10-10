import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const properties=fs.readFileSync(path.join(root,"src","ui","properties-panel-runtime.js"),"utf8");
test("question 433: Dimension Properties shows per-reason selection coverage",()=>{
  assert.match(properties,/const reviewReasonCoverage=Object\.fromEntries\(reviewReasons\.map\(reason=>\[/);
  assert.match(properties,/reviewProgressSnapshot\?\.reason_selection\?\.\[String\(reason\)\]\?\.selection_coverage\?\?null/);
  assert.match(properties,/reason_coverage:canonicalReviewContext\?\.reason_coverage\?\?reviewReasonCoverage/);
  assert.match(properties,/\["Dimension reason coverage",reviewDisplay\.reason_coverage\]/);
});
