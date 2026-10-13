import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","constraints-runtime.js"),"utf8");
const build=fs.readFileSync(path.join(root,"scripts","build-standalone.mjs"),"utf8");

test("question 80: inference runtime is valid and exposes Off Suggest Auto",()=>{
  assert.doesNotThrow(()=>new vm.Script(runtime,{filename:"constraints-runtime.js"}));
  assert.match(runtime,/constraint_inference/);
  assert.match(runtime,/option>Off/);
  assert.match(runtime,/option>Suggest/);
  assert.match(runtime,/option>Auto/);
  assert.match(runtime,/setInferenceMode/);
});

test("question 80: Suggest queues confirmation instead of silently modifying model",()=>{
  assert.match(runtime,/function queueSuggestion\(/);
  assert.match(runtime,/pendingAccepted\.set/);
  assert.match(runtime,/Constraint подтверждён и будет создан вместе с операцией/);
  const inferBlock=runtime.slice(runtime.indexOf("function inferCurrent"),runtime.indexOf("function equivalentConstraint"));
  assert.doesNotMatch(inferBlock,/upsertGeometricConstraint/);
});

test("question 80: Auto materializes only best confident inference inside model command",()=>{
  assert.match(runtime,/mode==="Auto"/);
  assert.match(runtime,/selectInferenceSuggestion\(fresh,\{minimum_score:\.25\}\)/);
  assert.match(runtime,/materializeSuggestion/);
  assert.match(build,/materializeInferenceForCommand\?\.\(\{label\}\)/);
  const i=build.indexOf("const inferredConstraintResult=");
  const validate=build.indexOf("const geometricConstraintResult=",i);
  assert.ok(i>=0&&validate>i,"inference must materialize before central constraint validation");
});

test("question 80: constraint management commands do not trigger surprise Auto inference",()=>{
  assert.match(runtime,/\/Constraint\|Auto-constraints\|Auto-Constrain\|Inference\/i\.test\(text\)/);
  assert.match(runtime,/skipped:true/);
});

test("question 80: duplicate inferred constraints are not created",()=>{
  assert.match(runtime,/function equivalentConstraint\(/);
  assert.match(runtime,/if\(!suggestion\|\|equivalentConstraint/);
});

test("question 80: snap and selection changes refresh suggestions",()=>{
  assert.match(runtime,/tubebender-selection-change/);
  assert.match(runtime,/tubebender-snap-change/);
  assert.match(runtime,/lastSnap=event\?\.detail\?\.current/);
  assert.match(runtime,/inferCurrent\(\)/);
});

test("question 80: inference domain is bundled into standalone runtime",()=>{
  assert.match(build,/constraintInferenceDomainPath/);
  assert.match(build,/__TB_CONSTRAINT_INFERENCE_MODULE_URL__/);
  assert.match(build,/constraintInferenceDomainUrl/);
});


test("question 83: contextual Tangent Perpendicular snap proposes matching Constraint first",()=>{
  assert.match(runtime,/\["Tangent","Perpendicular"\]\.includes\(String\(lastSnap\?\.type\)\)/);
  assert.match(runtime,/id:"infer:contextual:"\+contextualType/);
  assert.match(runtime,/type:contextualType/);
  assert.match(runtime,/evidence:\{contextual_snap:true,virtual:lastSnap\?\.virtual===true\}/);
  assert.match(runtime,/score:1/);
});
