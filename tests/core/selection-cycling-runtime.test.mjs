import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const selection=fs.readFileSync(path.join(root,"src","ui","object-selection-context-ui.js"),"utf8");

test("question 91: Selection Cycling runtime remains valid classic JavaScript",()=>{
  assert.doesNotThrow(()=>new vm.Script(selection,{filename:"object-selection-context-ui.js"}));
});

test("question 91: overlapping 3D objects are collected uniquely in raycast order",()=>{
  assert.match(selection,/function pick3DCandidates\(event\)/);
  assert.match(selection,/intersectObjects\(pipeGroup\.children,true\)/);
  assert.match(selection,/const out=\[\],seen=new Set\(\)/);
  assert.match(selection,/if\(!result\|\|seen\.has\(result\.key\)\)continue/);
  assert.match(selection,/return pick3DCandidates\(event\)\[0\]\?\?null/);
});

test("question 91: normal click selects best candidate and starts independent cycling",()=>{
  assert.match(selection,/const candidates=selectionCandidatesAtEvent\(event,\{direct\}\)/);
  assert.match(selection,/setSelectionCycle\(candidates,event,0\)/);
  assert.match(selection,/const candidate=candidates\[0\]/);
  assert.match(selection,/setSelectedKey\(candidate\.key/);
});

test("question 91: Tab cycles selection but yields to active Snap Cycling",()=>{
  assert.match(selection,/event\.key==="Tab"&&selectionCycle\.active/);
  assert.match(selection,/TubeBenderSnapTracking\?\.state\?\.\(\)\?\.active===true/);
  assert.match(selection,/if\(!snapActive&&!textTarget\)/);
  assert.match(selection,/cycleSelection\(event\.shiftKey\?-1:1\)/);
});

test("question 91: context menu exposes object-under-cursor candidate list",()=>{
  assert.match(selection,/data-object-action="selection-cycle"/);
  assert.match(selection,/Выбрать объект под курсором/);
  assert.match(selection,/function showObjectChooser\(event,candidates\)/);
  assert.match(selection,/data-cycle-index/);
  assert.match(selection,/button\.onmouseenter=\(\)=>applySelectionCycleIndex\(index\)/);
});

test("question 91: cycling candidate changes real selection so 3D and TreeView highlight stay synchronized",()=>{
  const block=selection.slice(selection.indexOf("function applySelectionCycleIndex"),selection.indexOf("function cycleSelection"));
  assert.match(block,/setSelectedKey\(candidate\.key/);
  assert.match(block,/revealTreeKey\(candidate\.key\)/);
  assert.match(selection,/updateTreeSelectionStyles\(\)/);
  assert.match(selection,/refreshVisualSelection\(\)/);
});
