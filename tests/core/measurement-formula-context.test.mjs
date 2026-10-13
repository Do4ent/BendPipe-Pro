import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const build=fs.readFileSync(path.join(root,"scripts","build-standalone.mjs"),"utf8");

test("question 66: latest measurement is available to the legacy formula engine as MEASURE",()=>{
  assert.match(build,/function tbMeasurementFormulaContext\(\)/);
  assert.match(build,/TubeBenderMeasurements\?\.formulaValue/);
  assert.match(build,/\{MEASURE:value,measure:value\}/);
  assert.match(build,/const ctx = \{\.\.\.tbMeasurementFormulaContext\(\)\}/);
  assert.match(build,/let ctx = \{\.\.\.tbMeasurementFormulaContext\(\)\}/);
});
