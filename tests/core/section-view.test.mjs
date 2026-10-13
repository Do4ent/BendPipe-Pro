import test from "node:test";
import assert from "node:assert/strict";
import {
  ensureSectionViewState,
  setSectionPlane,
  setSectionBox,
  disableSectionView,
  normalizeSectionView
} from "../../src/domain/project/section-view.mjs";

test("question 109: Section Plane is project state only and does not mutate geometry",()=>{
  const tube={id:"t1",origin:{x:1,y:2,z:3},rows:[{type:"LINE",L:100}]};
  const project={tubes:[tube]};
  const before=structuredClone(project.tubes);
  const state=setSectionPlane(project,{point:{x:10,y:0,z:0},normal:{x:1,y:0,z:0}});
  assert.equal(state.mode,"plane");
  assert.equal(state.enabled,true);
  assert.deepEqual(project.tubes,before);
});

test("question 109: Section Box keeps normalized min max bounds",()=>{
  const project={};
  const state=setSectionBox(project,{min:{x:-10,y:-20,z:-30},max:{x:40,y:50,z:60}});
  assert.equal(state.mode,"box");
  assert.deepEqual(state.box.min,{x:-10,y:-20,z:-30});
  assert.deepEqual(state.box.max,{x:40,y:50,z:60});
  assert.throws(()=>setSectionBox(project,{min:{x:1,y:0,z:0},max:{x:0,y:0,z:0}}),/max must be >= min/);
});

test("question 109: plane normal is normalized and can be flipped",()=>{
  const state=normalizeSectionView({mode:"plane",plane:{point:{x:0,y:0,z:0},normal:{x:10,y:0,z:0},flipped:true}});
  assert.deepEqual(state.plane.normal,{x:1,y:0,z:0});
  assert.equal(state.plane.flipped,true);
});

test("question 109: Section View can be disabled without losing plane box definitions",()=>{
  const project={};
  setSectionPlane(project,{point:{x:5,y:0,z:0},normal:{x:1,y:0,z:0}});
  const off=disableSectionView(project);
  assert.equal(off.mode,"off");
  assert.equal(off.enabled,false);
  assert.equal(off.plane.point.x,5);
  assert.equal(ensureSectionViewState(project).plane.point.x,5);
});
