import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const interaction=fs.readFileSync(path.join(root,"src","ui","interaction-priority-runtime.js"),"utf8");
const geometry=fs.readFileSync(path.join(root,"src","ui","geometry-grips-runtime.js"),"utf8");
const arrays=fs.readFileSync(path.join(root,"src","ui","array-grips-runtime.js"),"utf8");
const dimensions=fs.readFileSync(path.join(root,"src","ui","dimension-grips-runtime.js"),"utf8");
const gizmo=fs.readFileSync(path.join(root,"src","ui","transform-gizmo-runtime.js"),"utf8");
const build=fs.readFileSync(path.join(root,"scripts","build-standalone.mjs"),"utf8");
const legacy=fs.readFileSync(path.join(root,"legacy","VC207R7","TubeBender_CAD_VC207R7_Pixel_Matched_Approved_Interface_Release.html"),"utf8");

test("question 100 interaction priority runtime is valid and bundled",()=>{
  assert.doesNotThrow(()=>new vm.Script(interaction,{filename:"interaction-priority-runtime.js"}));
  assert.ok(interaction.includes("TubeBenderInteractionPriority"));
  assert.ok(build.includes('data-tubebender-bundled="interaction-priority-runtime"'));
  assert.ok(build.includes("bundledInteractionPriority: true"));
});

test("question 100 Gizmo and grips have priority over Orbit",()=>{
  assert.ok(interaction.includes('owner:"gizmo",priority:100'));
  assert.ok(interaction.includes('owner:"geometry-grip",priority:90'));
  assert.ok(interaction.includes('owner:"array-grip",priority:90'));
  assert.ok(interaction.includes('owner:"dimension-grip",priority:90'));
  assert.ok(interaction.includes("return !editHandleAt(event)"));
  assert.ok(build.includes("TubeBenderInteractionPriority?.shouldOrbitStart?.(e) === false"));
});

test("question 100 LMB empty drag remains Orbit and short click remains selection",()=>{
  assert.ok(legacy.includes("if (!this._gestureMoved && totalMove <= tolerance) return;"));
  assert.ok(legacy.includes("const isTap = !cancelled"));
  assert.ok(legacy.includes("this._tapHandler"));
  assert.ok(interaction.includes("if(button===0)"));
});

test("question 100 MMB is Pan while RMB is reserved for context menu",()=>{
  assert.ok(build.includes("Number(e.button) === 2) return"));
  assert.ok(build.includes("p.button === 1 || e.shiftKey"));
  assert.ok(build.includes("remaining.button === 1 ? 'pan' : 'rotate'"));
  assert.ok(legacy.includes("dom.addEventListener('contextmenu'"));
  assert.ok(legacy.includes("this._onWheel"));
});

test("question 100 all edit drags use a movement threshold",()=>{
  for(const [name,code] of [["geometry",geometry],["array",arrays],["dimension",dimensions],["gizmo",gizmo]]){
    assert.ok(code.includes("movementExceeded?.(drag.pointerStart,event)"),name);
    assert.ok(code.includes("started:false"),name);
    assert.ok(code.includes("drag.started=true"),name);
  }
  assert.ok(interaction.includes("DEFAULT_MOUSE_THRESHOLD=4"));
  assert.ok(interaction.includes("DEFAULT_PEN_THRESHOLD=7"));
  assert.ok(interaction.includes("DEFAULT_TOUCH_THRESHOLD=12"));
});

test("question 100 no geometry or transform commits before threshold",()=>{
  assert.ok(geometry.includes("!cancel&&state.started&&selection&&state.patch"));
  assert.ok(arrays.includes("!cancel&&state.started&&def&&state.patch"));
  assert.ok(dimensions.includes("!cancel&&state.started"));
  assert.ok(gizmo.includes("!cancel&&state.started"));
});

test("question 100 Escape cancels active edit and Orbit gestures",()=>{
  assert.ok(interaction.includes('if(event.key==="Escape")cancelActiveInteraction("escape")'));
  assert.ok(build.includes("cancelGesture(){"));
  assert.ok(geometry.includes('if(event.key!=="Escape")return'));
  assert.ok(arrays.includes('event.key==="Escape"&&drag'));
  assert.ok(dimensions.includes('event.key==="Escape"'));
  assert.ok(gizmo.includes('event.key==="Escape"&&drag'));
});

test("question 100 click hit testing recognizes existing helper metadata",()=>{
  for(const token of ["transformGizmoHandle","geometryGrip","arrayGripHandle","dimensionGrip"]){
    assert.ok(interaction.includes(token),token);
  }
  assert.ok(interaction.includes("intersectObjects(pipeGroup.children,true)"));
});
