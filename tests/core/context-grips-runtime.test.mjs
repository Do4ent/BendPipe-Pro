import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","geometry-grips-runtime.js"),"utf8");

test("question 98 context grip runtime remains valid JavaScript",()=>{
  assert.doesNotThrow(()=>new vm.Script(runtime,{filename:"geometry-grips-runtime.js"}));
});

test("question 98 whole object shows main Tube grips only",()=>{
  assert.ok(runtime.includes('if(selection.kind==="tube")return "whole"'));
  assert.ok(runtime.includes('kind:"tube-p1"'));
  assert.ok(runtime.includes('kind:"tube-p2"'));
  assert.ok(runtime.includes('kind:"tube-node"'));
  assert.ok(runtime.includes('if(mode==="all")return allTubeHandles(selection)'));
});

test("question 98 subelement selection shows detailed grips",()=>{
  assert.ok(runtime.includes('return "subelement"'));
  assert.ok(runtime.includes("return handleDescriptors(selection)"));
  for(const token of ["line-mid","line-end","bend-center","bend-radius","bend-plane"]){
    assert.ok(runtime.includes(token),token);
  }
});

test("question 98 double click enters internal grip mode",()=>{
  assert.ok(runtime.includes('addEventListener("dblclick",onDoubleClick,false)'));
  assert.ok(runtime.includes('internalEdit={tubeId:String(selection.tube.id),rowIndex:Number(selection.rowIndex)}'));
  assert.ok(runtime.includes('return "internal"'));
});

test("question 98 internal mode includes nearest linked grips only",()=>{
  assert.ok(runtime.includes("function internalNeighborHandles"));
  assert.ok(runtime.includes("[index-1,index+1]"));
  assert.ok(runtime.includes('"line-start","line-end","bend-tangent-in","bend-tangent-out","tube-p1","tube-p2"'));
  assert.ok(runtime.includes("uniqueHandles(out)"));
});

test("question 98 Show all grips option expands the whole Tube",()=>{
  assert.ok(runtime.includes("data-geometry-show-all"));
  assert.ok(runtime.includes("showAllGrips=event.target.checked===true"));
  assert.ok(runtime.includes("function allTubeHandles"));
  assert.ok(runtime.includes("for(let index=0;index<(selection.tube.rows??[]).length;index++)"));
  assert.ok(runtime.includes("setShowAll:"));
});

test("question 98 Escape leaves internal edit without changing geometry",()=>{
  assert.ok(runtime.includes("if(internalEdit){internalEdit=null;activeHandle=null;rebuild();}"));
});

test("question 98 exports display mode for other UI surfaces",()=>{
  assert.ok(runtime.includes("contextHandleDescriptors,gripDisplayMode"));
  assert.ok(runtime.includes("enterInternal:"));
  assert.ok(runtime.includes("exitInternal:"));
});
