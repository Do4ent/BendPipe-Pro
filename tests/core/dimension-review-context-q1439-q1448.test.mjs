import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 1439: review-context state helper remains publicly exposed",()=>{
  assert.match(ui,/dimensionReviewContextState,dimensionReviewContext/);
});

test("question 1440: review-context helper remains publicly exposed",()=>{
  assert.match(ui,/dimensionReviewContext,dimensionReviewContextSignature/);
});

test("question 1441: review-context signature helper remains publicly exposed",()=>{
  assert.match(ui,/dimensionReviewContextSignature,dimensionReviewContextSummary/);
});

test("question 1442: review-context summary helper remains publicly exposed",()=>{
  assert.match(ui,/dimensionReviewContextSummary,dimensionReviewContextSummarySignature/);
});

test("question 1443: review-context summary signature helper remains publicly exposed",()=>{
  assert.match(ui,/dimensionReviewContextSummarySignature,currentDimensionReviewContextSummary/);
});

test("question 1444: current review-context summary delegates to canonical summary helper",()=>{
  assert.match(ui,/currentDimensionReviewContextSummary:\(\)=>dimensionReviewContextSummary\(\)/);
});

test("question 1445: review-progress diagnostics helper remains publicly exposed",()=>{
  assert.match(ui,/dimensionReviewProgressDiagnostics,dimensionReviewProgressDiagnosticsState/);
});

test("question 1446: review-progress diagnostics state helper remains publicly exposed",()=>{
  assert.match(ui,/dimensionReviewProgressDiagnosticsState,dimensionReviewProgressDiagnosticsRuntimeState/);
});

test("question 1447: review-progress diagnostics runtime-state helper remains publicly exposed",()=>{
  assert.match(ui,/dimensionReviewProgressDiagnosticsRuntimeState,dimensionReviewProgressDiagnosticsIntegrity/);
});

test("question 1448: review-progress diagnostics integrity helper remains publicly exposed",()=>{
  assert.match(ui,/dimensionReviewProgressDiagnosticsIntegrity,dimensionReviewProgressDiagnosticsIntegritySignature/);
});
