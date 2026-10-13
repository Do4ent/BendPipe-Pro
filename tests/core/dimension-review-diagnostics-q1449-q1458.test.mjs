import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 1449: diagnostics integrity-signature helper remains publicly exposed",()=>{
  assert.match(ui,/dimensionReviewProgressDiagnosticsIntegritySignature,dimensionReviewProgressDiagnosticsIntegrityParity/);
});

test("question 1450: diagnostics integrity-parity helper remains publicly exposed",()=>{
  assert.match(ui,/dimensionReviewProgressDiagnosticsIntegrityParity,dimensionReviewProgressDiagnosticsIntegrityState/);
});

test("question 1451: diagnostics integrity-state helper remains publicly exposed",()=>{
  assert.match(ui,/dimensionReviewProgressDiagnosticsIntegrityState,dimensionReviewProgressDiagnosticsSnapshot/);
});

test("question 1452: diagnostics snapshot helper remains publicly exposed",()=>{
  assert.match(ui,/dimensionReviewProgressDiagnosticsSnapshot,dimensionReviewProgressDiagnosticsSignature/);
});

test("question 1453: diagnostics signature helper remains publicly exposed",()=>{
  assert.match(ui,/dimensionReviewProgressDiagnosticsSignature,dimensionReviewProgressSignature/);
});

test("question 1454: review-progress signature helper remains publicly exposed",()=>{
  assert.match(ui,/dimensionReviewProgressSignature,dimensionReviewProgressSnapshot/);
});

test("question 1455: review-progress snapshot helper remains publicly exposed",()=>{
  assert.match(ui,/dimensionReviewProgressSnapshot,currentCanonicalReviewProgress/);
});

test("question 1456: current canonical review-progress getter delegates to canonical helper",()=>{
  assert.match(ui,/currentCanonicalReviewProgress:\(\)=>canonicalDimensionReviewProgress\(\)/);
});

test("question 1457: current review-progress diagnostics getter reads diagnostics from one diagnostics state",()=>{
  assert.match(ui,/currentReviewProgressDiagnostics:\(\)=>dimensionReviewProgressDiagnosticsState\(\)\.diagnostics/);
});

test("question 1458: current review-progress diagnostics snapshot is derived from diagnostics state",()=>{
  assert.match(ui,/currentReviewProgressDiagnosticsSnapshot:\(\)=>dimensionReviewProgressDiagnosticsSnapshot\(dimensionReviewProgressDiagnosticsState\(\)\.diagnostics\)/);
});
