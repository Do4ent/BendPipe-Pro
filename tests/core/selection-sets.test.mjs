import test from "node:test";
import assert from "node:assert/strict";
import {
  createSelectionSet,
  renameSelectionSet,
  addSelectionSetMembers,
  removeSelectionSetMembers,
  deleteSelectionSet,
  selectionSetById,
  setsContainingRef,
  pruneSelectionSetMembers
} from "../../src/domain/project/selection-sets.mjs";

test("question 106: named Selection Set stores references without changing hierarchy",()=>{
  const tube={id:"t1",name:"Tube"};
  const project={tubes:[tube],groups:[{id:"g1",name:"G",members:[]}]};
  const before=structuredClone({tubes:project.tubes,groups:project.groups});
  const set=createSelectionSet(project,{name:"Install",members:[{kind:"tube",id:"t1"},{kind:"group",id:"g1"}]});
  assert.equal(set.kind,"StaticSelectionSet");
  assert.deepEqual({tubes:project.tubes,groups:project.groups},before);
  assert.equal(set.members.length,2);
});

test("question 106: one object may belong to multiple named sets",()=>{
  const project={};
  const a=createSelectionSet(project,{name:"A",members:[{kind:"tube",id:"t1"}]});
  const b=createSelectionSet(project,{name:"B",members:[{kind:"tube",id:"t1"}]});
  assert.deepEqual(new Set(setsContainingRef(project,{kind:"tube",id:"t1"}).map(set=>set.id)),new Set([a.id,b.id]));
});

test("question 106: add remove rename delete are explicit static-set operations",()=>{
  const project={};
  const set=createSelectionSet(project,{name:"A",members:[{kind:"tube",id:"t1"}]});
  addSelectionSetMembers(project,set.id,[{kind:"mesh-instance",id:"m1"}]);
  assert.equal(set.members.length,2);
  removeSelectionSetMembers(project,set.id,[{kind:"tube",id:"t1"}]);
  assert.deepEqual(set.members,[{kind:"mesh-instance",id:"m1"}]);
  renameSelectionSet(project,set.id,"B");
  assert.equal(selectionSetById(project,set.id).name,"B");
  assert.equal(deleteSelectionSet(project,set.id),true);
  assert.equal(selectionSetById(project,set.id),null);
});

test("question 106: deleted objects are pruned from all sets",()=>{
  const project={};
  const a=createSelectionSet(project,{name:"A",members:[{kind:"tube",id:"keep"},{kind:"tube",id:"gone"}]});
  const b=createSelectionSet(project,{name:"B",members:[{kind:"tube",id:"gone"}]});
  const removed=pruneSelectionSetMembers(project,ref=>ref.id==="keep");
  assert.equal(removed.length,2);
  assert.deepEqual(a.members,[{kind:"tube",id:"keep"}]);
  assert.deepEqual(b.members,[]);
});
