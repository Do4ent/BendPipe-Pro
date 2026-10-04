import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const uiPath=path.join(root,"src","ui","measurements-ui.js");
const code=fs.readFileSync(uiPath,"utf8");

test("Measurements UI remains valid classic JavaScript",()=>{
  assert.doesNotThrow(()=>new vm.Script(code,{filename:"measurements-ui.js"}));
  assert.match(code,/__TB_GEOMETRY_MEASUREMENTS_MODULE_URL__/);
  assert.match(code,/__TB_DIMENSIONS_MODULE_URL__/);
  assert.match(code,/TubeBenderMeasurements/);
});

test("Measurements panel uses shared TreeView and 3D selection API",()=>{
  assert.match(code,/TubeBenderObjectContext/);
  assert.match(code,/selectionEntries/);
  assert.match(code,/tubebender-selection-change/);
  assert.match(code,/Quick Measure использует текущий выбор TreeView\/3D/);
});

test("single LINE BEND and whole tube selections expose real engineering measurements",()=>{
  assert.match(code,/row\.type==="LINE"/);
  assert.match(code,/row\.type==="BEND"/);
  assert.match(code,/measureArc/);
  assert.match(code,/tube-total-centerline/);
  assert.match(code,/Arc length/);
  assert.match(code,/Chord/);
  assert.match(code,/Radius/);
  assert.match(code,/Diameter/);
});

test("two LINE rows use geometry directions for true 3D angle",()=>{
  assert.match(code,/entries\.length===2&&entries\.every/);
  assert.match(code,/directionFromEntry/);
  assert.match(code,/geometry\.measureAngleBetweenLines/);
  assert.match(code,/mode:"acute"/);
});

test("Quick Measure can persist Reference Dimension in project",()=>{
  assert.match(code,/dimensions\.createDimension/);
  assert.match(code,/mode:"Reference"/);
  assert.match(code,/p\.engineering_dimensions=/);
  assert.match(code,/Сохранить Reference Dimension/);
});

test("measurement display precision is project-level and separate from stored value",()=>{
  assert.match(code,/measurement_settings/);
  assert.match(code,/length_decimals/);
  assert.match(code,/angle_decimals/);
  assert.match(code,/trailing_zeros/);
  assert.match(code,/geometry\.formatMeasurement/);
});

test("Measurements button prefers the existing top header actions",()=>{
  assert.match(code,/document\.querySelector\("\.tb-head-actions"\)/);
  assert.match(code,/host\)host\.appendChild\(button\)/);
  assert.match(code,/button\.classList\.add\("tb-fixed"\)/);
});


test("question 64: Measurements UI exposes permanent Dimension Style controls",()=>{
  assert.match(code,/dimension_style/);
  assert.match(code,/data-dim-scale-mode/);
  assert.match(code,/Hybrid/);
  assert.match(code,/data-dim-text-px/);
  assert.match(code,/data-dim-arrow-px/);
  assert.match(code,/data-dim-ext-offset/);
  assert.match(code,/data-dim-line-offset/);
  assert.match(code,/data-dim-symbol-dia/);
  assert.match(code,/data-dim-symbol-radius/);
  assert.match(code,/data-dim-symbol-angle/);
  assert.match(code,/data-dim-color-reference/);
  assert.match(code,/data-dim-color-driving/);
  assert.match(code,/data-dim-color-error/);
  assert.match(code,/normalizeDimensionStyle/);
});

test("question 64: saved permanent dimensions snapshot the active project style",()=>{
  assert.match(code,/style:clone\(s\.dimension_style\)/);
  assert.match(code,/Изменить стиль постоянных размеров/);
});
