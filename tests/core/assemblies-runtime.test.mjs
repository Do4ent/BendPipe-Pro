import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","assemblies-runtime.js"),"utf8");
const selection=fs.readFileSync(path.join(root,"src","ui","object-selection-context-ui.js"),"utf8");
const locks=fs.readFileSync(path.join(root,"src","ui","object-lock-runtime.js"),"utf8");
const props=fs.readFileSync(path.join(root,"src","ui","properties-panel-runtime.js"),"utf8");
const build=fs.readFileSync(path.join(root,"scripts","build-standalone.mjs"),"utf8");

test("question 74: Assemblies runtime is valid classic JavaScript and bundled",()=>{
  assert.doesNotThrow(()=>new vm.Script(runtime,{filename:"assemblies-runtime.js"}));
  assert.match(runtime,/TubeBenderAssemblies/);
  assert.match(build,/data-tubebender-bundled="assemblies-runtime"/);
  assert.match(build,/bundledAssembliesRuntime: true/);
});

test("question 74: Project Assembly uses distinct selection kind from legacy tube assembly rows",()=>{
  assert.match(selection,/projectAssembly:"project-assembly:"/);
  assert.match(selection,/kind:"project-assembly"/);
  assert.match(selection,/data-project-assembly/);
  assert.match(selection,/data-assembly-member-key/);
  assert.match(selection,/kind:"assembly",tubeId/);
});

test("question 74: standard Move delegates Project Assembly selection atomically",()=>{
  assert.match(selection,/entries\.every\(entry=>entry\.kind==="project-assembly"\)/);
  assert.match(selection,/assembliesApi\(\)\?\.moveAssemblies/);
  assert.match(runtime,/function rootSelectionIds\(/);
  assert.match(runtime,/Move Assemblies/);
});

test("question 74: runtime synchronizes local coordinates before Assembly transform",()=>{
  assert.match(runtime,/function syncAssemblyLocals\(/);
  assert.match(runtime,/worldToLocalPoint/);
  assert.match(runtime,/worldToLocalQuaternion/);
  assert.match(runtime,/setAssemblyMemberLocal/);
  assert.match(runtime,/syncAssemblyLocals\(assemblyId\)/);
});

test("question 74: Assembly Move and Rotate apply rigid transforms to tubes and mesh instances",()=>{
  assert.match(runtime,/translateLegacyTubeRigid/);
  assert.match(runtime,/rotateLegacyTubeRigid/);
  assert.match(runtime,/moveEditableMeshInstance/);
  assert.match(runtime,/rotateEditableMeshInstanceAxis/);
  assert.match(runtime,/transformDescendantFrames/);
  assert.match(runtime,/applyAssemblyFrame/);
});

test("question 74: Set Origin rebases coordinates without calling geometry transform",()=>{
  const start=runtime.indexOf("function setOrigin");
  const end=runtime.indexOf("function dissolve",start);
  assert.ok(start>=0&&end>start);
  const block=runtime.slice(start,end);
  assert.match(block,/setAssemblyFrame/);
  assert.match(block,/syncAssemblyLocals/);
  assert.doesNotMatch(block,/transformTube/);
  assert.doesNotMatch(block,/transformMesh/);
  assert.doesNotMatch(block,/applyAssemblyFrame/);
});

test("question 74: Source reference must become editable before constructive Assembly membership",()=>{
  assert.match(runtime,/Source \/ Reference нельзя включить напрямую/);
  assert.match(runtime,/source-ref/);
});

test("question 74: dimensions move display geometry while associative values and references are untouched",()=>{
  const start=runtime.indexOf("function transformDimension");
  const end=runtime.indexOf("function transformLeaf",start);
  assert.ok(start>=0&&end>start);
  const block=runtime.slice(start,end);
  assert.match(block,/text_position/);
  assert.match(block,/local_plane/);
  assert.doesNotMatch(block,/\.value\s*=/);
  assert.doesNotMatch(block,/target_value\s*=/);
  assert.doesNotMatch(block,/references\s*=/);
});

test("question 74: Assembly TreeView and panel expose hierarchy Origin Fixed Visibility and locks",()=>{
  assert.match(runtime,/◫ Assemblies/);
  assert.match(runtime,/data-project-assembly/);
  assert.match(runtime,/data-assembly-origin/);
  assert.match(runtime,/data-assembly-fixed/);
  assert.match(runtime,/data-assembly-visible/);
  assert.match(runtime,/data-assembly-lock/);
  assert.match(runtime,/Dissolve/);
});

test("question 74: parent Assembly lock and Fixed state propagate to member editing",()=>{
  assert.match(locks,/TubeBenderAssemblies\?\.permissionForEntry/);
  assert.match(runtime,/ASSEMBLY_FIXED/);
  assert.match(runtime,/containingAssembliesForEntry/);
});

test("question 74: Property Panel identifies constructive Assembly and local coordinate system",()=>{
  assert.match(props,/entry\.kind==="project-assembly"/);
  assert.match(props,/Constructive Assembly/);
  assert.match(props,/Local coordinate system/);
  assert.match(props,/Dependencies preserved/);
});
