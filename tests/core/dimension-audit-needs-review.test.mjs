import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 171: Needs review is a conservative audit-only classification",()=>{
  assert.match(ui,/function dimensionAuditReviewReasons\(dimension\)/);
  assert.match(ui,/String\(dimension\?\.status\?\?""\)==="Stale"/);
  assert.match(ui,/geometryClass==="Fitted"/);
  assert.match(ui,/geometryClass==="Unknown"/);
  assert.match(ui,/function dimensionAuditNeedsReview\(dimension\)/);
  assert.match(ui,/dimensionAuditReviewReasons\(dimension\)\.length>0/);
});

test("question 171: audit summary and filters expose Needs review",()=>{
  assert.match(ui,/needs_review:0/);
  assert.match(ui,/summary\.needs_review\+\+/);
  assert.match(ui,/dimensionManagerFilter==="needs-review"/);
  assert.match(ui,/'needs-review':'Needs review'/);
  assert.match(ui,/Needs review: '\+auditSummary\.needs_review/);
});


test("question 172: Needs review is visible on each Saved Dimension row",()=>{
  assert.match(ui,/const reviewReasons=dimensionAuditReviewReasons\(dimension\)/);
  assert.match(ui,/const needsReview=reviewReasons\.length>0/);
  assert.match(ui,/needsReview\?"Audit: Needs review":null/);
  assert.match(ui,/data-dim-needs-review="1"/);
});


test("question 174: audit snapshot explains Needs review reasons",()=>{
  assert.match(ui,/reasons\.push\("Stale"\)/);
  assert.match(ui,/reasons\.push\("Fitted geometry"\)/);
  assert.match(ui,/reasons\.push\("Unknown geometry provenance"\)/);
  assert.match(ui,/review_reasons:clone\(dimensionAuditReviewReasons\(dimension\)\)/);
});


test("question 175: Saved Dimension row explains review reasons",()=>{
  assert.match(ui,/Review reasons: "\+reviewReasons\.join\(", "\)/);
});
