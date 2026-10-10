import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import {
  createAssembly,
  localToWorldPoint,
  worldToLocalPoint,
  axisAngleQuaternion
} from "../../src/domain/project/assemblies.mjs";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","assemblies-runtime.js"),"utf8");
const build=fs.readFileSync(path.join(root,"scripts","build-standalone.mjs"),"utf8");
const props=fs.readFileSync(path.join(root,"src","ui","properties-panel-runtime.js"),"utf8");

function near(a,b,eps=1e-9){assert.ok(Math.abs(a-b)<=eps,String(a)+" != "+String(b));}
function nearPoint(a,b,eps=1e-9){near(a.x,b.x,eps);near(a.y,b.y,eps);near(a.z,b.z,eps);}

test("question 76: an Assembly-local port anchor follows parent Move and Rotate without changing local coordinates",()=>{
  const project={};
  const assembly=createAssembly(project,{
    name:"A",
    frame:{origin_mm:{x:100,y:0,z:0}},
    members:[{ref:{kind:"tube",id:"t1"},local:{position_mm:{x:20,y:5,z:0}}}]
  });
  const world={x:120,y:5,z:0};
  const local=worldToLocalPoint(assembly.frame,world);
  nearPoint(local,{x:20,y:5,z:0});

  const movedFrame={origin_mm:{x:150,y:10,z:0},rotation_quaternion:axisAngleQuaternion({x:0,y:0,z:1},90)};
  const movedWorld=localToWorldPoint(movedFrame,local);
  nearPoint(movedWorld,{x:145,y:30,z:0});
  nearPoint(worldToLocalPoint(movedFrame,movedWorld),local);
});

test("question 76: Assemblies runtime is valid and stores explicit local constraints on P1/P2",()=>{
  assert.doesNotThrow(()=>new vm.Script(runtime,{filename:"assemblies-runtime.js"}));
  assert.match(runtime,/assembly_port_constraint_v1/);
  assert.match(runtime,/function syncTubePortConstraints\(/);
  assert.match(runtime,/p1\.locked=true/);
  assert.match(runtime,/if\(p2\.locked===true\)setPortAssemblyConstraint/);
  assert.match(runtime,/else delete p2\.assembly_constraint/);
  assert.match(runtime,/worldToLocalPoint\(parent\.frame,worldPosition\)/);
});

test("question 76: a tube constraint is bound to the immediate parent Assembly",()=>{
  assert.match(runtime,/assembliesContainingMember\(project\(\),ref,\{includeAncestors:false\}\)/);
  assert.match(runtime,/function directTubeAssembly\(/);
  assert.match(runtime,/assembly_id:String\(parent\.id\)/);
});

test("question 76: fixed P2 capture and resolution convert local anchor through the current parent frame",()=>{
  assert.match(runtime,/function captureTubeEndConstraint\(/);
  assert.match(runtime,/function resolveTubeEndConstraintTarget\(/);
  assert.match(runtime,/localToWorldPoint\(parent\.frame,constraint\.local_position_mm\)/);
  assert.match(runtime,/String\(directParent\.id\)!==String\(parent\.id\)/);
});

test("question 76: membership changes initialize or clear Assembly-local port anchors",()=>{
  assert.match(runtime,/if\(member\.ref\.kind==="tube"\)syncTubePortConstraints\(member\.ref\.id\)/);
  assert.match(runtime,/Удалить компоненты из Assembly/);
  assert.match(runtime,/if\(ref\.kind==="tube"\)syncTubePortConstraints\(ref\.id\)/);
  assert.match(runtime,/Dissolve Assembly/);
});

test("question 76: whole-component Move and Rotate bypass shape solver then resynchronize local anchors",()=>{
  const moveStart=runtime.indexOf("function moveEditEntries");
  const rotateStart=runtime.indexOf("function rotateEditEntries");
  const transformStart=runtime.indexOf("function transformDescendantFrames",rotateStart);
  assert.ok(moveStart>=0&&rotateStart>moveStart&&transformStart>rotateStart);
  const moveBlock=runtime.slice(moveStart,rotateStart);
  const rotateBlock=runtime.slice(rotateStart,transformStart);
  assert.match(moveBlock,/syncAssemblyLocals\(active\.id\)/);
  assert.match(moveBlock,/\{wholeObject:true\}/);
  assert.match(rotateBlock,/syncAssemblyLocals\(active\.id\)/);
  assert.match(rotateBlock,/\{wholeObject:true\}/);
});

test("question 76: central fixed-end guard captures Assembly constraint and resolves target after Assembly transform",()=>{
  assert.match(build,/captureTubeEndConstraint/);
  assert.match(build,/assemblyConstraint:assemblyConstraint\?deep\(assemblyConstraint\):null/);
  assert.match(build,/resolveTubeEndConstraintTarget/);
  assert.match(build,/const target=assemblyResolved\?\.position\?\?guard\.target/);
  assert.match(build,/space:assemblyResolved\?'assembly-local':'world'/);
  assert.match(build,/локальная фиксация P2 потеряла родительскую Assembly/);
});

test("question 76: P2 lock and unlock synchronize the Assembly-local constraint",()=>{
  assert.match(build,/syncTubePortConstraints\?\.\(t\)/);
  assert.match(build,/clearTubePortConstraint\?\.\(t,'P2'\)/);
  assert.match(build,/assemblyConstraint:deep\(p2\.assembly_constraint\?\?null\)/);
});

test("question 76: P1 remains non-removable and permanently locked",()=>{
  assert.match(build,/e\.ports\.P1\.locked=true/);
  assert.match(build,/engPort_P1_locked/);
  assert.match(build,/checked disabled/);
  assert.match(build,/Начальная точка всегда зафиксирована/);
});

test("question 76: Properties expose Assembly-local P1 and P2 anchor state",()=>{
  assert.match(props,/function assemblyPortAnchorLabel\(/);
  assert.match(props,/P1 Assembly anchor/);
  assert.match(props,/P2 Assembly anchor/);
  assert.match(props,/⚓ fixed/);
});
