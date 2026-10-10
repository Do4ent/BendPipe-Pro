import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","constraints-runtime.js"),"utf8");
const build=fs.readFileSync(path.join(root,"scripts","build-standalone.mjs"),"utf8");

test("question 79: Constraints runtime is valid classic JavaScript and bundled",()=>{
  assert.doesNotThrow(()=>new vm.Script(runtime,{filename:"constraints-runtime.js"}));
  assert.match(runtime,/TubeBenderConstraints/);
  assert.match(build,/data-tubebender-bundled="constraints-runtime"/);
  assert.match(build,/bundledConstraintsRuntime: true/);
});

test("question 79: runtime creates constraints from selected geometry and keeps Assembly context",()=>{
  assert.match(runtime,/function selectedReferences\(/);
  assert.match(runtime,/assembly_context:clone\(context\)/);
  assert.match(runtime,/contextForObjectId/);
  assert.match(runtime,/function createFromSelection\(/);
  assert.match(runtime,/crossAssemblyForContexts/);
  assert.match(runtime,/upsertGeometricConstraint/);
});

test("question 79: fixed constraints snapshot current point direction and geometry",()=>{
  assert.match(runtime,/type==="FixedPoint"/);
  assert.match(runtime,/type==="FixedDirection"/);
  assert.match(runtime,/type==="FixedGeometry"/);
  assert.match(runtime,/signature:clone/);
});

test("question 79: project validation blocks only enabled Driving conflicts",()=>{
  assert.match(runtime,/function validateProject\(/);
  assert.match(runtime,/item\.enabled!==false&&item\.driving!==false/);
  assert.match(runtime,/next\.status!=="Valid"&&next\.status!=="Disabled"/);
  assert.match(runtime,/conflicts\.push/);
});

test("question 79: central model command validates and atomically rolls back geometric constraint violations",()=>{
  assert.match(build,/TubeBenderConstraints\?\.validateProject\?\.\(\{update:true\}\)/);
  assert.match(build,/if\(geometricConstraintResult\?\.ok===false\)/);
  const i=build.indexOf("const geometricConstraintResult=");
  const block=build.slice(i,i+900);
  assert.match(block,/tbHistoryCancel\(token\)/);
  assert.match(block,/tbHistoryRestore\(token\.before\)/);
  assert.match(block,/геометрический Constraint нарушен/);
});

test("question 79: panel exposes type driving enabled delete and recalculate workflows",()=>{
  assert.match(runtime,/GEOMETRIC_CONSTRAINT_TYPES/);
  assert.match(runtime,/data-con-type/);
  assert.match(runtime,/data-con-driving/);
  assert.match(runtime,/data-con-enabled/);
  assert.match(runtime,/data-con-delete/);
  assert.match(runtime,/data-con-refresh/);
  assert.match(runtime,/Создать из выбора/);
});
