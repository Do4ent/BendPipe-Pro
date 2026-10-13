import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 1469: current review-progress runtime-state getter delegates to runtime helper",()=>{
  assert.match(ui,/currentReviewProgressRuntimeState:\(\)=>dimensionReviewProgressRuntimeState\(\)/);
});

test("question 1470: current review-progress snapshot is derived from current review progress",()=>{
  assert.match(ui,/currentReviewProgressSnapshot:\(\)=>dimensionReviewProgressSnapshot\(dimensionReviewProgress\(\)\)/);
});

test("question 1471: current domain review-progress snapshot safely checks domain support",()=>{
  assert.match(ui,/currentDomainReviewProgressSnapshot:\(\)=>\{const progress=domainDimensionReviewProgress\(\);return progress&&reviewProgressDomain\?\.reviewProgressSnapshot\?reviewProgressDomain\.reviewProgressSnapshot\(progress\):null;\}/);
});

test("question 1472: current review-progress signature is derived from current review progress",()=>{
  assert.match(ui,/currentReviewProgressSignature:\(\)=>dimensionReviewProgressSignature\(dimensionReviewProgress\(\)\)/);
});

test("question 1473: current review-queue audit snapshot getter delegates to queue snapshot helper",()=>{
  assert.match(ui,/currentReviewQueueAuditSnapshot:\(\)=>reviewQueueDimensionAuditSnapshot\(\)/);
});

test("question 1474: current review-reason audit snapshot getter delegates to reason snapshot helper",()=>{
  assert.match(ui,/currentReviewReasonAuditSnapshot:\(\)=>reviewReasonDimensionAuditSnapshot\(\)/);
});

test("question 1475: review-queue audit snapshot helper remains publicly exposed",()=>{
  assert.match(ui,/reviewQueueDimensionAuditSnapshot,reviewReasonDimensionAuditSnapshot/);
});

test("question 1476: review-reason audit snapshot helper remains publicly exposed",()=>{
  assert.match(ui,/reviewReasonDimensionAuditSnapshot,dimensionReferenceStatusCounts/);
});

test("question 1477: dimension reference-status counts helper remains publicly exposed",()=>{
  assert.match(ui,/dimensionReferenceStatusCounts,dimensionFittedAuditStats/);
});

test("question 1478: fitted dimension-audit stats helper remains publicly exposed",()=>{
  assert.match(ui,/dimensionFittedAuditStats,auditNumber/);
});
