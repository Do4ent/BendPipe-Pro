import test from "node:test";
import assert from "node:assert/strict";
import {
  createGroup,
  addGroupMembers,
  removeGroupMembers,
  groupById,
  groupDescendantIds,
  groupsContainingMember,
  leafGroupMembers,
  renameGroup,
  setGroupLock,
  setGroupVisibility,
  ungroup,
  wouldCreateGroupCycle
} from "../../src/domain/project/groups.mjs";

test("question 73: Groups are logical references and do not merge member geometry",()=>{
  const tube={id:"tube-1",origin:{x:1,y:2,z:3},rows:[{type:"LINE",L:100}]};
  const project={tubes:[tube]};
  const before=structuredClone(tube);
  const group=createGroup(project,{name:"Frame",members:[{kind:"tube",id:"tube-1"}]});
  assert.equal(group.kind,"LogicalGroup");
  assert.deepEqual(tube,before);
  assert.deepEqual(group.members,[{kind:"tube",id:"tube-1"}]);
});

test("question 73: nested Groups flatten to unique leaves and cycles are forbidden",()=>{
  const project={};
  const a=createGroup(project,{name:"A",members:[{kind:"tube",id:"t1"}]});
  const b=createGroup(project,{name:"B",members:[{kind:"tube",id:"t2"},{kind:"group",id:a.id}]});
  const c=createGroup(project,{name:"C",members:[{kind:"group",id:b.id},{kind:"tube",id:"t1"}]});
  assert.deepEqual(groupDescendantIds(project,c.id),[b.id,a.id]);
  assert.deepEqual(leafGroupMembers(project,c.id),[
    {kind:"tube",id:"t2"},
    {kind:"tube",id:"t1"}
  ]);
  assert.equal(wouldCreateGroupCycle(project,a.id,c.id),true);
  assert.throws(()=>addGroupMembers(project,a.id,[{kind:"group",id:c.id}]),/cycle/i);
});

test("question 73: invalid Group creation rolls back completely",()=>{
  const project={};
  assert.throws(()=>createGroup(project,{name:"Bad",members:[{kind:"group",id:"missing"}]}),/Nested group not found/);
  assert.deepEqual(project.groups,[]);
});

test("question 73: add remove rename visibility and lock affect only logical Group metadata",()=>{
  const project={};
  const group=createGroup(project,{name:"G",members:[{kind:"tube",id:"a"}]});
  addGroupMembers(project,group.id,[{kind:"tube",id:"b"}]);
  assert.equal(group.members.length,2);
  removeGroupMembers(project,group.id,[{kind:"tube",id:"a"}]);
  assert.deepEqual(group.members,[{kind:"tube",id:"b"}]);
  renameGroup(project,group.id,"Renamed");
  setGroupVisibility(project,group.id,false);
  setGroupLock(project,group.id,"Position");
  assert.equal(group.name,"Renamed");
  assert.equal(group.visible,false);
  assert.equal(group.lock_state.mode,"Position");
});

test("question 73: Ungroup preserves member references and replaces nested occurrence in parent",()=>{
  const project={};
  const child=createGroup(project,{name:"Child",members:[{kind:"tube",id:"a"},{kind:"tube",id:"b"}]});
  const parent=createGroup(project,{name:"Parent",members:[{kind:"group",id:child.id},{kind:"tube",id:"c"}]});
  const before=child.members.map((ref)=>structuredClone(ref));
  const released=ungroup(project,child.id);
  assert.deepEqual(released,before);
  assert.equal(groupById(project,child.id),null);
  assert.deepEqual(parent.members,[
    {kind:"tube",id:"a"},
    {kind:"tube",id:"b"},
    {kind:"tube",id:"c"}
  ]);
});

test("question 73: direct and ancestor group lookup remain distinguishable",()=>{
  const project={};
  const child=createGroup(project,{name:"Child",members:[{kind:"tube",id:"a"}]});
  const parent=createGroup(project,{name:"Parent",members:[{kind:"group",id:child.id}]});
  assert.deepEqual(groupsContainingMember(project,{kind:"tube",id:"a"},{includeAncestors:false}).map(g=>g.id),[child.id]);
  assert.deepEqual(new Set(groupsContainingMember(project,{kind:"tube",id:"a"}).map(g=>g.id)),new Set([child.id,parent.id]));
});
