import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 123: Measurements panel lists all saved Dimensions",()=>{
  assert.match(ui,/function dimensionManagerHtml\(\)/);
  assert.match(ui,/Saved Dimensions/);
  assert.match(ui,/Управление сохранёнными Reference\/Driving Dimensions/);
});

test("question 123: hidden Dimensions can be restored from the manager",()=>{
  assert.match(ui,/data-dim-manager-visible/);
  assert.match(ui,/TubeBenderDimensionGrips\?\.setDimensionVisible/);
});

test("question 123: manager supports selection and specialized delete",()=>{
  assert.match(ui,/data-dim-manager-select/);
  assert.match(ui,/TubeBenderDimensionGrips\?\.selectDimension/);
  assert.match(ui,/data-dim-manager-delete/);
  assert.match(ui,/TubeBenderDimensionGrips\?\.deleteDimension/);
});

test("question 123: stale Section-derived rows keep explicit Rebind",()=>{
  assert.match(ui,/stale&&isSectionDerivedDimension\(dimension\)/);
  assert.match(ui,/data-section-rebind/);
});
