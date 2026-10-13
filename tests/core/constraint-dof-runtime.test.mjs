import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","constraints-runtime.js"),"utf8");
const build=fs.readFileSync(path.join(root,"scripts","build-standalone.mjs"),"utf8");

test("question 81: Constraints runtime remains valid with DoF integration",()=>{
  assert.doesNotThrow(()=>new vm.Script(runtime,{filename:"constraints-runtime.js"}));
  assert.match(runtime,/__TB_CONSTRAINT_DOF_MODULE_URL__/);
  assert.match(runtime,/function dofAnalysis\(/);
  assert.match(runtime,/analyzeConstraintDoF/);
});

test("question 81: panel reports constrained state reasons and remaining DoF",()=>{
  assert.match(runtime,/Under-constrained/);
  assert.match(runtime,/Fully constrained/);
  assert.match(runtime,/remaining_dof/);
  assert.match(runtime,/redundant_constraint_ids/);
  assert.match(runtime,/conflict_constraint_ids/);
  assert.match(runtime,/invalid_constraint_ids/);
});

test("question 81: 3D helpers visualize free translation and rotation",()=>{
  assert.match(runtime,/THREE\.ArrowHelper/);
  assert.match(runtime,/THREE\.TorusGeometry/);
  assert.match(runtime,/free_translation/);
  assert.match(runtime,/free_rotation/);
  assert.match(runtime,/constraintDofHelper/);
});

test("question 81: redundant and conflicting constraints are highlighted",()=>{
  assert.match(runtime,/Redundant \/ Over-constrained/);
  assert.match(runtime,/tb-con-conflict/);
});

test("question 81: DoF module is bundled and refreshed after successful model commands",()=>{
  assert.match(build,/constraintDofDomainPath/);
  assert.match(build,/__TB_CONSTRAINT_DOF_MODULE_URL__/);
  assert.match(build,/TubeBenderConstraints\?\.refreshDoF/);
  assert.match(build,/tubebender-constraints-change/);
});
