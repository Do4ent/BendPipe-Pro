import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const properties=fs.readFileSync(path.join(root,"src","ui","properties-panel-runtime.js"),"utf8");

test("question 448: Dimension Properties cross-checks canonical review context API",()=>{
  assert.match(properties,/const canonicalReviewContext=audit\?\.dimensionReviewContext\?\.\(dimension\)\?\?null/);
  assert.match(properties,/const reviewContextConsistent=canonicalReviewContext==null\?null:/);
  assert.match(properties,/canonicalReviewContext\.selected_in_audit===selectedInAudit/);
  assert.match(properties,/canonicalReviewContext\.state===dimensionReviewState/);
  assert.match(properties,/canonicalReviewContext\.health===reviewContextHealth/);
  assert.match(properties,/\["Review context API consistent",reviewContextConsistent\]/);
});
