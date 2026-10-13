import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath,pathToFileURL } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtimePath=path.join(root,"src","ui","associative-array-runtime.js");
const buildPath=path.join(root,"scripts","build-standalone.mjs");
const uiPath=path.join(root,"src","ui","editing-ui.js");
const runtime=fs.readFileSync(runtimePath,"utf8");
const build=fs.readFileSync(buildPath,"utf8");
const ui=fs.readFileSync(uiPath,"utf8");

test("question 94: associative Array runtime bundles Dynamic Input and exports advanced API",()=>{
  assert.match(runtime,/__TB_DYNAMIC_INPUT_MODULE_URL__/);
  assert.match(build,/replace\("__TB_DYNAMIC_INPUT_MODULE_URL__", dynamicInputDomainUrl\)/);
  assert.match(runtime,/previewParameters/);
  assert.match(runtime,/setParameterFormula/);
  assert.match(runtime,/formulaFields:Object\.freeze/);
  assert.match(runtime,/initial_angle_deg/);
  assert.match(runtime,/radius_mm/);
  assert.match(runtime,/clockwise/);
});

test("question 94: zero values are preserved instead of replaced by fallback",()=>{
  assert.match(runtime,/Number\.isFinite\(raw\)\?raw:fallback/);
  assert.doesNotMatch(runtime,/Number\(rawParameterValue\(def,name\)\)\|\|fallback/);
});

test("question 94: scalar formulas remain unitless",()=>{
  const dynamic=fs.readFileSync(path.join(root,"src","domain","editing","dynamic-input.mjs"),"utf8");
  assert.match(dynamic,/if\(kind==="scalar"\)return expr/);
});

test("question 94: preview clears formula overrides without mutating source definition",()=>{
  const previewBlock=runtime.slice(runtime.indexOf("function previewParameters"),runtime.indexOf("function setParameterFormula"));
  assert.match(previewBlock,/const def=clone\(sourceDef\)/);
  assert.match(previewBlock,/if\(text\)def\.parameter_formulas\[name\]=text;else delete def\.parameter_formulas\[name\]/);
  assert.doesNotMatch(previewBlock,/sourceDef\.parameter_formulas\s*=/);
});

test("question 94: UI exposes radius initial angle clockwise and formula preview",()=>{
  assert.match(ui,/data-array-radius/);
  assert.match(ui,/data-array-initial/);
  assert.match(ui,/data-array-clockwise/);
  assert.match(ui,/data-array-create-formula-field/);
  assert.match(ui,/data-array-formula-field/);
  assert.match(ui,/data-array-formula-value/);
  assert.match(ui,/data-array-preview-run/);
  assert.match(ui,/Preview/);
  assert.match(ui,/Clear formula/);
});

test("question 94: applying Array formula validates through preview before committing",()=>{
  const start=ui.indexOf("function applyArrayFormula");
  const end=ui.indexOf("function arrayPanelHtml",start);
  const block=ui.slice(start,end);
  assert.match(block,/runtime\.previewParameters/);
  assert.match(block,/commit\(clear\?"Снять формулу Array":"Изменить формулу Array"/);
  assert.match(block,/runtime\.setParameterFormula/);
});
