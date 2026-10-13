import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 1499: select visible dimension-audit results action remains publicly exposed",()=>{
  assert.match(ui,/selectVisibleDimensionAuditResults,selectReviewReasonDimensionResults/);
});

test("question 1500: select review-reason dimension results action remains publicly exposed",()=>{
  assert.match(ui,/selectReviewReasonDimensionResults,addReviewReasonDimensionResultsToSelection/);
});

test("question 1501: add review-reason results to selection action remains publicly exposed",()=>{
  assert.match(ui,/addReviewReasonDimensionResultsToSelection,removeReviewReasonDimensionResultsFromSelection/);
});

test("question 1502: remove review-reason results from selection action remains publicly exposed",()=>{
  assert.match(ui,/removeReviewReasonDimensionResultsFromSelection,invertReviewReasonDimensionSelection/);
});

test("question 1503: invert review-reason dimension selection action remains publicly exposed",()=>{
  assert.match(ui,/invertReviewReasonDimensionSelection,selectReviewQueueDimensionResults/);
});

test("question 1504: select review-queue dimension results action remains publicly exposed",()=>{
  assert.match(ui,/selectReviewQueueDimensionResults,addReviewQueueDimensionResultsToSelection/);
});

test("question 1505: add review-queue results to selection action remains publicly exposed",()=>{
  assert.match(ui,/addReviewQueueDimensionResultsToSelection,removeReviewQueueDimensionResultsFromSelection/);
});

test("question 1506: remove review-queue results from selection action remains publicly exposed",()=>{
  assert.match(ui,/removeReviewQueueDimensionResultsFromSelection,invertReviewQueueDimensionSelection/);
});

test("question 1507: invert review-queue dimension selection action remains publicly exposed",()=>{
  assert.match(ui,/invertReviewQueueDimensionSelection,showDimensionAuditResults/);
});

test("question 1508: show dimension-audit results action remains publicly exposed",()=>{
  assert.match(ui,/showDimensionAuditResults,showAndSelectDimensionAuditResults/);
});
