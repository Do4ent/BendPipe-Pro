import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 168: Fitted audit stats are conservative across references",()=>{
  assert.match(ui,/function dimensionFittedAuditStats\(dimension\)/);
  assert.match(ui,/geometry_status\?\?""\)==="Fitted"/);
  assert.match(ui,/max_error_mm:mm\.length\?Math\.max\(\.\.\.mm\):null/);
  assert.match(ui,/max_error_deg:deg\.length\?Math\.max\(\.\.\.deg\):null/);
  assert.match(ui,/min_confidence:confidence\.length\?Math\.min\(\.\.\.confidence\):null/);
});

test("question 168: Saved Dimension row surfaces Fitted stats only when present",()=>{
  assert.match(ui,/const fittedStats=dimensionFittedAuditStats\(dimension\)/);
  assert.match(ui,/Fitted refs: /);
  assert.match(ui,/max error /);
  assert.match(ui,/min confidence /);
});
