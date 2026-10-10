import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 134: hidden Dimensions are labeled Show & Select in Saved Dimensions",()=>{
  assert.match(ui,/visible\?'Select':'Show & Select'/);
  assert.match(ui,/data-select-visible/);
});

test("question 134: manager shows hidden Dimension before selecting it",()=>{
  assert.match(ui,/if\(!visible\)window\.TubeBenderDimensionGrips\?\.setDimensionVisible\?\.\(id,true\)/);
  assert.match(ui,/TubeBenderDimensionGrips\?\.selectDimension\?\.\(id\)/);
});
