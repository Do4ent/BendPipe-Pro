import test from "node:test";
import assert from "node:assert/strict";
import {
  createAssembly,
  addAssemblyMembers,
  assemblyById,
  assemblyDescendantIds,
  assembliesContainingMember,
  leafAssemblyMembers,
  localToWorldPoint,
  worldToLocalPoint,
  axisAngleQuaternion,
  normalizeAssemblyFrame,
  setAssemblyMemberLocal,
  setAssemblyVisibility,
  setAssemblyLock,
  dissolveAssembly,
  wouldCreateAssemblyCycle
} from "../../src/domain/project/assemblies.mjs";

function near(a,b,eps=1e-9){assert.ok(Math.abs(a-b)<=eps,String(a)+" != "+String(b));}
function nearPoint(a,b,eps=1e-9){near(a.x,b.x,eps);near(a.y,b.y,eps);near(a.z,b.z,eps);}

test("question 74: Assembly local/world coordinates round-trip through Origin and rotation",()=>{
  const frame=normalizeAssemblyFrame({
    origin_mm:{x:100,y:50,z:0},
    rotation_quaternion:axisAngleQuaternion({x:0,y:0,z:1},90)
  });
  const local={x:10,y:0,z:5};
  const world=localToWorldPoint(frame,local);
  nearPoint(world,{x:100,y:60,z:5});
  nearPoint(worldToLocalPoint(frame,world),local);
});

test("question 74: creating Assembly does not merge or rewrite component geometry",()=>{
  const tube={id:"t1",origin:{x:10,y:20,z:30},rows:[{type:"LINE",L:100}]};
  const project={tubes:[tube]};
  const before=structuredClone(tube);
  const assembly=createAssembly(project,{
    name:"Module",
    frame:{origin_mm:{x:0,y:0,z:0}},
    members:[{ref:{kind:"tube",id:"t1"},local:{position_mm:{x:10,y:20,z:30}}}]
  });
  assert.equal(assembly.kind,"Assembly");
  assert.deepEqual(tube,before);
  assert.equal(assembly.members[0].ref.kind,"tube");
  assert.deepEqual(assembly.members[0].local.position_mm,{x:10,y:20,z:30});
});

test("question 74: nested Assemblies flatten to leaf components and cycles are forbidden",()=>{
  const project={};
  const child=createAssembly(project,{name:"Child",members:[{ref:{kind:"tube",id:"a"},local:{position_mm:{x:1,y:0,z:0}}}]});
  const parent=createAssembly(project,{name:"Parent",members:[
    {ref:{kind:"assembly",id:child.id},local:{position_mm:{x:0,y:0,z:0}}},
    {ref:{kind:"mesh-instance",id:"m1"},local:{position_mm:{x:2,y:0,z:0}}}
  ]});
  assert.deepEqual(assemblyDescendantIds(project,parent.id),[child.id]);
  assert.deepEqual(leafAssemblyMembers(project,parent.id).map(m=>m.ref),[
    {kind:"tube",id:"a"},
    {kind:"mesh-instance",id:"m1"}
  ]);
  assert.equal(wouldCreateAssemblyCycle(project,child.id,parent.id),true);
  assert.throws(()=>addAssemblyMembers(project,child.id,[{ref:{kind:"assembly",id:parent.id},local:{}}]),/cycle/i);
});

test("question 74: direct component parent and ancestor Assembly lookup stay distinct",()=>{
  const project={};
  const child=createAssembly(project,{name:"Child",members:[{ref:{kind:"tube",id:"a"},local:{position_mm:{x:0,y:0,z:0}}}]});
  const parent=createAssembly(project,{name:"Parent",members:[{ref:{kind:"assembly",id:child.id},local:{position_mm:{x:0,y:0,z:0}}}]});
  assert.deepEqual(assembliesContainingMember(project,{kind:"tube",id:"a"},{includeAncestors:false}).map(a=>a.id),[child.id]);
  assert.deepEqual(new Set(assembliesContainingMember(project,{kind:"tube",id:"a"}).map(a=>a.id)),new Set([child.id,parent.id]));
});

test("question 74: member local transform can be resynchronized after direct component editing",()=>{
  const project={};
  const assembly=createAssembly(project,{frame:{origin_mm:{x:100,y:0,z:0}},members:[
    {ref:{kind:"tube",id:"a"},local:{position_mm:{x:10,y:0,z:0}}}
  ]});
  setAssemblyMemberLocal(project,assembly.id,{kind:"tube",id:"a"},{position_mm:{x:25,y:5,z:0}});
  assert.deepEqual(assemblyById(project,assembly.id).members[0].local.position_mm,{x:25,y:5,z:0});
});

test("question 74: dissolving nested Assembly rebases local coordinates without moving world point",()=>{
  const project={};
  const child=createAssembly(project,{
    name:"Child",
    frame:{origin_mm:{x:110,y:0,z:0}},
    members:[{ref:{kind:"tube",id:"a"},local:{position_mm:{x:5,y:0,z:0}}}]
  });
  const parent=createAssembly(project,{
    name:"Parent",
    frame:{origin_mm:{x:100,y:0,z:0}},
    members:[{ref:{kind:"assembly",id:child.id},local:{position_mm:{x:10,y:0,z:0}}}]
  });
  const worldBefore=localToWorldPoint(child.frame,child.members[0].local.position_mm);
  dissolveAssembly(project,child.id);
  const promoted=parent.members.find(m=>m.ref.kind==="tube"&&m.ref.id==="a");
  assert.ok(promoted);
  const worldAfter=localToWorldPoint(parent.frame,promoted.local.position_mm);
  nearPoint(worldBefore,worldAfter);
  nearPoint(promoted.local.position_mm,{x:15,y:0,z:0});
});

test("question 74: Assembly visibility and locks are hierarchy metadata",()=>{
  const project={};
  const assembly=createAssembly(project,{name:"A"});
  setAssemblyVisibility(project,assembly.id,false);
  setAssemblyLock(project,assembly.id,"Position");
  assert.equal(assembly.visible,false);
  assert.equal(assembly.lock_state.mode,"Position");
  assert.throws(()=>setAssemblyLock(project,assembly.id,"invalid"),/lock mode/i);
});
