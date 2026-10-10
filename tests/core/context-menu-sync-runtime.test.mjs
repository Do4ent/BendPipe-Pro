import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const context=fs.readFileSync(path.join(root,"src","ui","object-selection-context-ui.js"),"utf8");

test("question 102 context source remains valid JavaScript",()=>{
  assert.doesNotThrow(()=>new vm.Script(context,{filename:"object-selection-context-ui.js"}));
});

test("question 102 3D and TreeView use the same type profile",()=>{
  assert.ok(context.includes("const profile=contextProfile(entries,source)"));
  assert.ok(context.includes("function contextProfile(entries=selectionEntries(),source="));
  assert.ok(context.includes('tube:{title:"Tube"'));
  assert.ok(context.includes('"project-assembly":{title:"Assembly"'));
});

test("question 102 unsupported core commands stay visible disabled with a reason",()=>{
  assert.ok(context.includes("function setContextButtonAvailability"));
  assert.ok(context.includes("button.disabled=allowed!==true"));
  assert.ok(context.includes("button.dataset.blockReason"));
  assert.ok(context.includes(".tb-context-reason"));
  assert.ok(context.includes("reasonNode.hidden=allowed===true"));
  assert.ok(context.includes("visible:hasSelection"));
});

test("question 102 TreeView Move is no longer hidden as a 3D-only command",()=>{
  const start=context.indexOf("if(move){");
  const block=context.slice(start,start+1800);
  assert.ok(start>=0);
  assert.ok(block.includes("canMoveSelection()"));
  assert.ok(block.includes("move.hidden=!hasSelection"));
  assert.ok(!block.includes('source==="3d"'));
  assert.ok(!block.includes('source!=="3d"'));
});

test("question 102 permission failures expose lock or layer reason",()=>{
  assert.ok(context.includes('lockApi()?.permissionForSelection?.("move")'));
  assert.ok(context.includes("String(permission.reason||"));
  assert.ok(context.includes("contextBlockedReason"));
  assert.ok(context.includes("Source / Reference доступен только для чтения"));
});

test("question 102 right click in 3D selects and reveals the same object in TreeView",()=>{
  const start=context.indexOf("function onCanvasContext");
  const block=context.slice(start,start+1900);
  assert.ok(block.includes("setSelectedKey(key,{additive:false})"));
  assert.ok(block.includes("revealTreeKey(key)"));
  assert.ok(block.includes('showContextMenu(event,{source:"3d"})'));
});

test("question 102 right click in TreeView selects and highlights the same 3D object",()=>{
  const start=context.indexOf("function onTreeContext");
  const block=context.slice(start,start+1900);
  assert.ok(block.includes("setSelectedKey(key,{additive:false})"));
  assert.ok(block.includes('showContextMenu(event,{source:"tree"})'));
  assert.ok(context.includes("function refreshVisualSelection"));
  assert.ok(context.includes("updateTreeSelectionStyles()"));
  assert.ok(context.includes('new CustomEvent("tubebender-selection-change"'));
});

test("question 102 grouped TreeView rows participate in the synchronized context menu",()=>{
  assert.ok(context.includes("[data-project-group]"));
  assert.ok(context.includes("[data-group-member-key]"));
  assert.ok(context.includes("[data-project-assembly]"));
  assert.ok(context.includes("[data-assembly-member-key]"));
  assert.ok(context.includes("treeRowFromTarget"));
});

test("question 102 Selection Cycling remains a 3D cursor-specific command",()=>{
  assert.ok(context.includes('source!=="3d"||count<2'));
  assert.ok(context.includes("Выбрать объект под курсором…"));
});
