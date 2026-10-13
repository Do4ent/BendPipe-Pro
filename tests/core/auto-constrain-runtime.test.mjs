import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","constraints-runtime.js"),"utf8");
const build=fs.readFileSync(path.join(root,"scripts","build-standalone.mjs"),"utf8");

test("question 82: runtime is valid and preview is mandatory before Apply",()=>{
  assert.doesNotThrow(()=>new vm.Script(runtime,{filename:"constraints-runtime.js"}));
  assert.match(runtime,/function previewAutoConstrain\(/);
  assert.match(runtime,/function applyAutoConstrainPreview\(/);
  assert.match(runtime,/if\(!autoPlan\)\{toast\("Сначала создайте Auto-Constrain Preview"\);return false;\}/);
  assert.match(runtime,/data-auto-con-preview/);
  assert.match(runtime,/Apply confirmed set/);
});

test("question 82: preview uses planner and exposes per-suggestion confirmation checkboxes",()=>{
  assert.match(runtime,/buildAutoConstrainPlan/);
  assert.match(runtime,/autoPlanSelected=new Set/);
  assert.match(runtime,/data-auto-con-id/);
  assert.match(runtime,/toggleAutoPlanSuggestion/);
});

test("question 82: system tube relations are excluded from Auto-Constrain",()=>{
  assert.match(runtime,/function systemRelationKeysForAuto/);
  assert.match(runtime,/systemicTypes=new Set\(\["Coincident","Collinear","Tangent","Concentric"\]\)/);
  assert.match(runtime,/tubeById\(objectIds\[0\]\)/);
});

test("question 82: confirmed set is one model command and creates only geometric Constraints",()=>{
  const start=runtime.indexOf("function applyAutoConstrainPreview");
  const end=runtime.indexOf("function cancelAutoConstrainPreview",start);
  const block=runtime.slice(start,end);
  assert.match(block,/command\("Apply Auto-Constrain preview"/);
  assert.match(block,/upsertGeometricConstraint/);
  assert.doesNotMatch(block,/engineering_dimensions/);
  assert.doesNotMatch(block,/createDimension/);
  assert.match(block,/recalculateAll\(\)/);
});

test("question 82: UI explicitly reports no numeric Driving Dimensions and DoF delta",()=>{
  assert.match(runtime,/Numeric Driving Dimensions: не создаются/);
  assert.match(runtime,/DoF .* → /);
  assert.match(runtime,/dof_before/);
  assert.match(runtime,/dof_after/);
  assert.match(runtime,/dof_reduction/);
});

test("question 82: Auto-Constrain does not trigger question 80 Auto inference",()=>{
  assert.match(runtime,/Auto-Constrain\|Inference/);
  assert.match(runtime,/skipped:true/);
});

test("question 82: planner is bundled into standalone",()=>{
  assert.match(build,/autoConstrainDomainPath/);
  assert.match(build,/__TB_AUTO_CONSTRAIN_MODULE_URL__/);
  assert.match(build,/autoConstrainDomainUrl/);
});
