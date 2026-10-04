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
  assert.match(code,/Временные измерения по Snap без создания объекта размера/);
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


test("question 65: Quick Measure is a separate temporary Snap mode",()=>{
  assert.match(code,/const quick=\{active:false,points:\[\],candidates:\[\],current:null,result:null\}/);
  assert.match(code,/startQuickMeasure/);
  assert.match(code,/stopQuickMeasure/);
  assert.match(code,/clearQuickMeasure/);
  assert.match(code,/snapTracking\(\)\?\.startCommand\?\.\("quick-measure"/);
  assert.match(code,/tubebender-snap-change/);
  assert.match(code,/Временные измерения по Snap без создания объекта размера/);
});

test("question 65: sequential Quick Measure reports length deltas and three-point angle",()=>{
  assert.match(code,/geometry\.measurePointToPoint/);
  assert.match(code,/\["ΔX",m\.delta_mm\.x,"mm"\]/);
  assert.match(code,/\["ΔY",m\.delta_mm\.y,"mm"\]/);
  assert.match(code,/\["ΔZ",m\.delta_mm\.z,"mm"\]/);
  assert.match(code,/geometry\.measureThreePointAngle/);
  assert.match(code,/quick\.points\.push/);
  assert.match(code,/Каждый следующий клик продолжает последовательное измерение/);
});

test("question 65: Esc clears temporary result then exits and no dimension is created until Save",()=>{
  assert.match(code,/event\.key==="Escape"/);
  assert.match(code,/if\(quick\.points\.length\|\|quick\.result\)clearQuickMeasure\(\);else stopQuickMeasure\(\)/);
  const captureBlock=code.slice(code.indexOf("function captureQuickCandidate"),code.indexOf("function onQuickSnapChange"));
  assert.doesNotMatch(captureBlock,/engineering_dimensions/);
  assert.match(code,/Сохранить как размер/);
  assert.match(code,/p\.engineering_dimensions=/);
});

test("question 65: Quick Measure keeps temporary 3D helper geometry outside object selection",()=>{
  assert.match(code,/tbQuickMeasureOverlay/);
  assert.match(code,/quickMeasure:true/);
  assert.match(code,/helper:true,objectSelectionHelper:true/);
  assert.match(code,/clearQuickPreview/);
});

test("question 65: radius remains available for BEND quick inspection",()=>{
  assert.match(code,/\["Radius",m\.radius_mm,"mm"\]/);
  assert.match(code,/row\.type==="BEND"/);
});
