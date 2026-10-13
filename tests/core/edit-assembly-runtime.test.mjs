import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","assemblies-runtime.js"),"utf8");
const selection=fs.readFileSync(path.join(root,"src","ui","object-selection-context-ui.js"),"utf8");
const gizmo=fs.readFileSync(path.join(root,"src","ui","transform-gizmo-runtime.js"),"utf8");
const props=fs.readFileSync(path.join(root,"src","ui","properties-panel-runtime.js"),"utf8");

test("question 75: Edit Assembly runtime remains valid classic JavaScript",()=>{
  assert.doesNotThrow(()=>new vm.Script(runtime,{filename:"assemblies-runtime.js"}));
  assert.match(runtime,/const editPath=\[\]/);
  assert.match(runtime,/function activeEditAssembly\(/);
  assert.match(runtime,/function editing\(/);
});

test("question 75: Edit Assembly supports multi-level breadcrumb navigation",()=>{
  assert.match(runtime,/\["Project",\.\.\.editPath\.map/);
  assert.match(runtime,/function enterEdit\(/);
  assert.match(runtime,/function exitEdit\(/);
  assert.match(runtime,/function exitAllEdit\(/);
  assert.match(runtime,/tbAssemblyEditBreadcrumb/);
  assert.match(runtime,/На уровень выше/);
  assert.match(runtime,/Выйти из Edit Assembly/);
});

test("question 75: double click enters Assembly from 3D or TreeView and Escape exits one level",()=>{
  assert.match(selection,/function onCanvasDoubleClick\(/);
  assert.match(selection,/function onTreeDoubleClick\(/);
  assert.match(selection,/assembliesApi\(\)\?\.enterEdit/);
  assert.match(selection,/addEventListener\("dblclick",onCanvasDoubleClick\)/);
  assert.match(selection,/addEventListener\("dblclick",onTreeDoubleClick\)/);
  assert.match(runtime,/event\.key==="Escape"&&editing\(\)/);
  assert.match(runtime,/exitEdit\(\)/);
});

test("question 75: ordinary mode resolves a component to its outer Assembly",()=>{
  assert.match(runtime,/function topAssemblyForEntry\(/);
  assert.match(runtime,/if\(!active\)/);
  assert.match(runtime,/project-assembly:/);
  assert.match(selection,/resolveInteraction\?\.\(picked\.entry,picked\.key\)/);
});

test("question 75: current edit level resolves nested content to direct child Assembly",()=>{
  assert.match(runtime,/function directMemberEntry\(/);
  assert.match(runtime,/member\.ref\.kind!=="assembly"/);
  assert.match(runtime,/return \{kind:"project-assembly",assemblyId:String\(member\.ref\.id\)\}/);
  assert.match(selection,/assemblyResolved\?\.blocked/);
});

test("question 75: click context menu and Box Lasso all respect Edit Assembly scope",()=>{
  assert.match(selection,/resolveInteraction\?\.\(parsed,key\)/);
  assert.match(selection,/const rawKeys=candidates/);
  assert.match(selection,/assembliesApi\(\)\?\.resolveInteraction\?\.\(entry,rawKey\)/);
});

test("question 75: external geometry is visually muted and restored without changing geometry",()=>{
  assert.match(runtime,/function muteEditMaterial\(/);
  assert.match(runtime,/opacity=Math\.min\(Number\(m\.opacity\?\?1\),\.22\)/);
  assert.match(runtime,/function restoreEditMaterial\(/);
  assert.match(runtime,/function applyEditContext\(/);
  assert.doesNotMatch(runtime,/tbAssemblyEditMaterial.*position_mm/);
});

test("question 75: Edit Assembly Move changes component geometry and synchronizes local transform in one command",()=>{
  const start=runtime.indexOf("function moveEditEntries");
  const end=runtime.indexOf("function rotateEditEntries",start);
  assert.ok(start>=0&&end>start);
  const block=runtime.slice(start,end);
  assert.match(block,/command\("Edit Assembly Move"/);
  assert.match(block,/translateLeafDirect/);
  assert.match(block,/applyAssemblyFrame/);
  assert.match(block,/syncAssemblyLocals\(active\.id\)/);
});

test("question 75: Edit Assembly Rotate changes component geometry and synchronizes local transform in one command",()=>{
  const start=runtime.indexOf("function rotateEditEntries");
  const end=runtime.indexOf("function transformDescendantFrames",start);
  assert.ok(start>=0&&end>start);
  const block=runtime.slice(start,end);
  assert.match(block,/command\("Edit Assembly Rotate"/);
  assert.match(block,/rotateLeafDirect/);
  assert.match(block,/syncAssemblyLocals\(active\.id\)/);
});

test("question 75: standard Move delegates active Edit Assembly members to local edit command",()=>{
  assert.match(selection,/assembliesApi\(\)\?\.editing\?\.\(\)/);
  assert.match(selection,/assembliesApi\(\)\?\.moveEditEntries/);
});

test("question 75: 3D Gizmo uses active Assembly local coordinate system and local Rotate command",()=>{
  assert.match(gizmo,/assembliesApi\(\)\?\.editing\?\.\(\)/);
  assert.match(gizmo,/activeEditAssembly\?\.\(\)\?\.frame/);
  assert.match(gizmo,/rotateEditEntries/);
  assert.match(gizmo,/leafAssemblyMembers/);
});

test("question 75: Property Panel displays active Assembly breadcrumb context",()=>{
  assert.match(props,/assemblyEditContextLabel/);
  assert.match(props,/Assembly context/);
  assert.match(props,/tubebender-assembly-edit-change/);
});
