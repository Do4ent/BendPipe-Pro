import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const grips=fs.readFileSync(path.join(root,"src","ui","array-grips-runtime.js"),"utf8");
const arrays=fs.readFileSync(path.join(root,"src","ui","associative-array-runtime.js"),"utf8");
const props=fs.readFileSync(path.join(root,"src","ui","properties-panel-runtime.js"),"utf8");
const editing=fs.readFileSync(path.join(root,"src","ui","editing-ui.js"),"utf8");
const build=fs.readFileSync(path.join(root,"scripts","build-standalone.mjs"),"utf8");

test("question 95: Array grips runtime is valid classic JavaScript and bundled",()=>{
  assert.doesNotThrow(()=>new vm.Script(grips,{filename:"array-grips-runtime.js"}));
  assert.match(grips,/TubeBenderArrayGrips/);
  assert.match(build,/data-tubebender-bundled="array-grips-runtime"/);
  assert.match(build,/bundledArrayGrips: true/);
});

test("question 95: Linear and Matrix expose step count and direction grips",()=>{
  assert.match(grips,/kind:"step"/);
  assert.match(grips,/kind:"count"/);
  assert.match(grips,/kind:"direction"/);
  assert.match(grips,/kind:"matrix-step"/);
  assert.match(grips,/kind:"matrix-count"/);
  assert.match(grips,/kind:"matrix-direction"/);
});

test("question 95: Circular exposes radius axis initial total count and CW CCW controls",()=>{
  assert.match(grips,/kind:"radius"/);
  assert.match(grips,/kind:"circular-axis"/);
  assert.match(grips,/kind:"initial-angle"/);
  assert.match(grips,/kind:"total-angle"/);
  assert.match(grips,/kind:"clockwise"/);
  assert.match(grips,/Toggle Array CW\/CCW/);
});

test("question 95: drag uses preview only until pointer-up commit",()=>{
  const updateStart=grips.indexOf("function update(event)");
  const updateEnd=grips.indexOf("function finish(event",updateStart);
  const update=grips.slice(updateStart,updateEnd);
  assert.match(update,/preview\(def,patch\)/);
  assert.doesNotMatch(update,/updateParameters/);
  const finish=grips.slice(updateEnd,grips.indexOf("function setExactFromPatch",updateEnd));
  assert.match(finish,/commitPatch\(def,state\.patch,"3D Array grip"\)/);
});

test("question 95: live preview comes from associative previewParameters API",()=>{
  assert.match(grips,/arrays\(\)\?\.previewParameters/);
  assert.match(grips,/Array Grip Preview/);
  assert.match(grips,/Preview members:/);
  const preview=arrays.slice(arrays.indexOf("function previewParameters"),arrays.indexOf("function setParameterFormula"));
  assert.match(preview,/const def=clone\(sourceDef\)/);
});

test("question 95: exact input commits only the active Array parameter",()=>{
  assert.match(grips,/data-array-grip-value/);
  assert.match(grips,/data-array-grip-apply/);
  assert.match(grips,/function exactPatch/);
  assert.match(grips,/Exact Array parameter/);
});

test("question 95: Property Panel exposes associative dependency and direct editor entry",()=>{
  assert.match(props,/function arrayDefinitionForTube/);
  assert.match(props,/Array role/);
  assert.match(props,/Evaluated parameters/);
  assert.match(props,/Formulas/);
  assert.match(props,/data-property-edit-array/);
  assert.match(props,/TubeBenderEditing\?\.open\?\.\("array"\)/);
});

test("question 95: Array change events synchronize grips properties and editor",()=>{
  assert.match(arrays,/tubebender-array-change/);
  assert.match(grips,/tubebender-array-change/);
  assert.match(props,/tubebender-array-change/);
  assert.match(editing,/tubebender-array-change/);
});

test("question 95: formulas remain associative while 3D grips edit numeric parameters",()=>{
  assert.match(arrays,/parameter_formulas/);
  assert.match(arrays,/setParameterFormula/);
  assert.match(editing,/data-array-formula-value/);
  assert.match(editing,/previewArrayFormula/);
  assert.match(grips,/arrays\(\)\?\.updateParameters/);
});
