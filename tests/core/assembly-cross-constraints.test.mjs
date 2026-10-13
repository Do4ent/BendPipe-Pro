import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","assemblies-runtime.js"),"utf8");

test("question 78: Assembly transform guard is valid and wraps Move Rotate",()=>{
  assert.doesNotThrow(()=>new vm.Script(runtime,{filename:"assemblies-runtime.js"}));
  assert.match(runtime,/function q78GuardedAssemblyTransform\(/);
  assert.match(runtime,/q78GuardedAssemblyTransform\(roots\.length>1\?"Move Assemblies":"Move Assembly"/);
  assert.match(runtime,/q78GuardedAssemblyTransform\("Rotate Assembly",\[id\]/);
});

test("question 78: cross-Assembly Reference dimensions are recalculated from Assembly-local contexts",()=>{
  assert.match(runtime,/function q78ReferenceWorldPoint\(/);
  assert.match(runtime,/assemblies\.localToWorldPoint\(a\.frame,context\.local_point_mm\)/);
  assert.match(runtime,/function q78ValidateAfterAssemblyTransform\(/);
  assert.match(runtime,/dim\.value=value/);
  assert.match(runtime,/if\(dim\.mode==="Driving"\)/);
  assert.match(runtime,/else dim\.status="Valid"/);
});

test("question 78: Driving dimensions and explicit constraints fail closed on conflict",()=>{
  assert.match(runtime,/dim\.status="Conflict"/);
  assert.match(runtime,/Cross-Assembly constraint cannot be resolved fail-closed/);
  assert.match(runtime,/Math\.abs\(value-spec\.target\)>spec\.tolerance/);
  assert.match(runtime,/lower\.includes\("coincident"\)\?0:Number\(targetRaw\)/);
});

test("question 78: conflict restores full project snapshot and never auto-breaks links",()=>{
  assert.match(runtime,/const p=project\(\),snapshot=clone\(p\)/);
  assert.match(runtime,/q78RestoreProject\(snapshot\)/);
  assert.match(runtime,/Перемещение Assembly отменено: конфликт межсборочных constraints/);
  const guard=runtime.slice(runtime.indexOf("function q78GuardedAssemblyTransform"),runtime.indexOf("function tubeDirection"));
  assert.doesNotMatch(guard,/splice\(/);
  assert.doesNotMatch(guard,/delete.*cross_assembly_links/);
  assert.doesNotMatch(guard,/filter\(.*cross_assembly_links/);
});

test("question 78: associative cross-links stay valid and refresh world points",()=>{
  assert.match(runtime,/function q78UpdateReferenceContexts\(/);
  assert.match(runtime,/ref\.assembly_context\.world_point_mm=clone\(point\)/);
  assert.match(runtime,/link\.status="Valid"/);
  assert.match(runtime,/last_cross_assembly_validation/);
});

test("question 78: diagnostic validator is exposed for QA without bypassing model command",()=>{
  assert.match(runtime,/validateCrossAssemblyAfterTransform:q78ValidateAfterAssemblyTransform/);
});
