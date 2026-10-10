import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 1509: show-and-select dimension-audit results action remains publicly exposed",()=>{
  assert.match(ui,/showAndSelectDimensionAuditResults,hideDimensionAuditResults/);
});

test("question 1510: hide dimension-audit results action remains publicly exposed",()=>{
  assert.match(ui,/hideDimensionAuditResults,\s*startQuickMeasure/);
});

test("question 1511: start quick-measure action remains publicly exposed",()=>{
  assert.match(ui,/startQuickMeasure,stopQuickMeasure/);
});

test("question 1512: stop quick-measure action remains publicly exposed",()=>{
  assert.match(ui,/stopQuickMeasure,clearQuickMeasure/);
});

test("question 1513: clear quick-measure action remains publicly exposed",()=>{
  assert.match(ui,/clearQuickMeasure,captureQuickCandidate/);
});

test("question 1514: capture quick-measure candidate action remains publicly exposed",()=>{
  assert.match(ui,/captureQuickCandidate,\s*copyMeasurementResult/);
});

test("question 1515: copy measurement-result action remains publicly exposed",()=>{
  assert.match(ui,/copyMeasurementResult,useMeasurementInFormula/);
});

test("question 1516: use-measurement-in-formula action remains publicly exposed",()=>{
  assert.match(ui,/useMeasurementInFormula,\s*formulaValue/);
});

test("question 1517: formula-value getter exposes the current formula measurement value",()=>{
  assert.match(ui,/formulaValue:\(\)=>formulaMeasurementValue/);
});

test("question 1518: open-results action opens the panel and renders the last result",()=>{
  assert.match(ui,/openResults:\(\)=>\{ensureResultsPanel\(\)\.classList\.add\("open"\);renderResultsPanel\(lastResult\);\}/);
});
