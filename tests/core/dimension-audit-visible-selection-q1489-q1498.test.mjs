import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 1489: download-selected dimension audits action remains publicly exposed",()=>{
  assert.match(ui,/downloadSelectedDimensionAudits,visibleDimensionAuditSnapshot/);
});

test("question 1490: visible dimension-audit snapshot helper remains publicly exposed",()=>{
  assert.match(ui,/visibleDimensionAuditSnapshot,copyVisibleDimensionAudits/);
});

test("question 1491: copy-visible dimension audits action remains publicly exposed",()=>{
  assert.match(ui,/copyVisibleDimensionAudits,activeDimensionReviewReason/);
});

test("question 1492: active dimension review-reason helper remains publicly exposed",()=>{
  assert.match(ui,/activeDimensionReviewReason,filteredDimensionManagerItems/);
});

test("question 1493: filtered dimension-manager items helper remains publicly exposed",()=>{
  assert.match(ui,/filteredDimensionManagerItems,clearDimensionSelection/);
});

test("question 1494: clear dimension selection action remains publicly exposed",()=>{
  assert.match(ui,/clearDimensionSelection,pruneDimensionSelectionToAuditView/);
});

test("question 1495: prune selection-to-audit-view action remains publicly exposed",()=>{
  assert.match(ui,/pruneDimensionSelectionToAuditView,invertVisibleDimensionAuditSelection/);
});

test("question 1496: invert visible audit selection action remains publicly exposed",()=>{
  assert.match(ui,/invertVisibleDimensionAuditSelection,removeVisibleDimensionAuditResultsFromSelection/);
});

test("question 1497: remove visible audit results from selection action remains publicly exposed",()=>{
  assert.match(ui,/removeVisibleDimensionAuditResultsFromSelection,addVisibleDimensionAuditResultsToSelection/);
});

test("question 1498: add visible audit results to selection action remains publicly exposed",()=>{
  assert.match(ui,/addVisibleDimensionAuditResultsToSelection,selectVisibleDimensionAuditResults/);
});
