import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 1459: current diagnostics signature getter reads signature from diagnostics state",()=>{
  assert.match(ui,/currentReviewProgressDiagnosticsSignature:\(\)=>dimensionReviewProgressDiagnosticsState\(\)\.signature/);
});

test("question 1460: current diagnostics state getter delegates to diagnostics state helper",()=>{
  assert.match(ui,/currentReviewProgressDiagnosticsState:\(\)=>dimensionReviewProgressDiagnosticsState\(\)/);
});

test("question 1461: current diagnostics runtime-state getter delegates to runtime helper",()=>{
  assert.match(ui,/currentReviewProgressDiagnosticsRuntimeState:\(\)=>dimensionReviewProgressDiagnosticsRuntimeState\(\)/);
});

test("question 1462: current diagnostics integrity getter reads integrity from one integrity state",()=>{
  assert.match(ui,/currentReviewProgressDiagnosticsIntegrity:\(\)=>dimensionReviewProgressDiagnosticsIntegrityState\(\)\.integrity/);
});

test("question 1463: current diagnostics integrity-signature getter reads signature from integrity state",()=>{
  assert.match(ui,/currentReviewProgressDiagnosticsIntegritySignature:\(\)=>dimensionReviewProgressDiagnosticsIntegrityState\(\)\.signature/);
});

test("question 1464: current diagnostics integrity-parity getter reads parity from integrity state",()=>{
  assert.match(ui,/currentReviewProgressDiagnosticsIntegrityParity:\(\)=>dimensionReviewProgressDiagnosticsIntegrityState\(\)\.parity/);
});

test("question 1465: current diagnostics integrity-state getter delegates to integrity-state helper",()=>{
  assert.match(ui,/currentReviewProgressDiagnosticsIntegrityState:\(\)=>dimensionReviewProgressDiagnosticsIntegrityState\(\)/);
});

test("question 1466: current canonical review-progress snapshot getter reads canonical snapshot",()=>{
  assert.match(ui,/currentCanonicalReviewProgressSnapshot:\(\)=>canonicalDimensionReviewProgress\(\)\.snapshot/);
});

test("question 1467: current canonical review-progress signature getter reads canonical signature",()=>{
  assert.match(ui,/currentCanonicalReviewProgressSignature:\(\)=>canonicalDimensionReviewProgress\(\)\.signature/);
});

test("question 1468: current canonical review-progress source getter reads canonical source",()=>{
  assert.match(ui,/currentCanonicalReviewProgressSource:\(\)=>canonicalDimensionReviewProgress\(\)\.source/);
});
