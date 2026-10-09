import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 1479: audit-number helper remains publicly exposed",()=>{
  assert.match(ui,/auditNumber,dimensionAuditReviewReasons/);
});

test("question 1480: audit review-reasons helper remains publicly exposed",()=>{
  assert.match(ui,/dimensionAuditReviewReasons,dimensionAuditNeedsReview/);
});

test("question 1481: audit needs-review helper remains publicly exposed",()=>{
  assert.match(ui,/dimensionAuditNeedsReview,dimensionAuditSummary/);
});

test("question 1482: audit summary helper remains publicly exposed",()=>{
  assert.match(ui,/dimensionAuditSummary,allDimensionAuditSnapshot/);
});

test("question 1483: all-dimension audit snapshot helper remains publicly exposed",()=>{
  assert.match(ui,/allDimensionAuditSnapshot,copyAllDimensionAudits/);
});

test("question 1484: copy-all dimension audits action remains publicly exposed",()=>{
  assert.match(ui,/copyAllDimensionAudits,selectedDimensionAuditIds/);
});

test("question 1485: selected dimension-audit ids helper remains publicly exposed",()=>{
  assert.match(ui,/selectedDimensionAuditIds,dimensionSelectionKindCounts/);
});

test("question 1486: selection kind-counts helper remains publicly exposed",()=>{
  assert.match(ui,/dimensionSelectionKindCounts,selectedDimensionAuditSnapshot/);
});

test("question 1487: selected dimension-audit snapshot helper remains publicly exposed",()=>{
  assert.match(ui,/selectedDimensionAuditSnapshot,copySelectedDimensionAudits/);
});

test("question 1488: copy-selected dimension audits action remains publicly exposed",()=>{
  assert.match(ui,/copySelectedDimensionAudits,downloadSelectedDimensionAudits/);
});
