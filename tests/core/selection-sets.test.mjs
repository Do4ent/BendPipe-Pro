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
  pruneSelectionSetMembers,
  createDynamicSelectionSet,
  updateDynamicSelectionSetRules,
  evaluateDynamicSelectionSet
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


test("question 107: Dynamic Selection Set stores rules instead of members",()=>{
  const project={};
  const set=createDynamicSelectionSet(project,{
    name:"Imported tubes",
    rules:{match:"all",rules:[
      {field:"kind",operator:"eq",value:"tube"},
      {field:"imported",operator:"truthy",value:true}
    ]}
  });
  assert.equal(set.kind,"DynamicSelectionSet");
  assert.equal("members" in set,false);
  assert.equal(set.rules.match,"all");
  assert.equal(set.rules.rules.length,2);
  assert.throws(()=>addSelectionSetMembers(project,set.id,[{kind:"tube",id:"t1"}]),/rule-derived/);
});

test("question 107: Dynamic Selection Set recalculates from current candidates",()=>{
  const project={};
  const set=createDynamicSelectionSet(project,{
    name:"Copper layer",
    rules:{match:"all",rules:[
      {field:"kind",operator:"eq",value:"tube"},
      {field:"layer_id",operator:"eq",value:"layer-copper"}
    ]}
  });
  const candidates=[
    {ref:{kind:"tube",id:"t1"},kind:"tube",layer_id:"layer-copper",name:"A"},
    {ref:{kind:"tube",id:"t2"},kind:"tube",layer_id:"layer-other",name:"B"}
  ];
  assert.deepEqual(evaluateDynamicSelectionSet(set,candidates),[{kind:"tube",id:"t1"}]);
  candidates.push({ref:{kind:"tube",id:"t3"},kind:"tube",layer_id:"layer-copper",name:"C"});
  assert.deepEqual(evaluateDynamicSelectionSet(set,candidates),[
    {kind:"tube",id:"t1"},
    {kind:"tube",id:"t3"}
  ]);
});

test("question 107: Dynamic rules support all any and common filter operators",()=>{
  const project={};
  const set=createDynamicSelectionSet(project,{
    name:"Rules",
    rules:{match:"any",rules:[
      {field:"name",operator:"contains",value:"feed"},
      {field:"group_ids",operator:"in",value:["g2"]}
    ]}
  });
  const candidates=[
    {ref:{kind:"tube",id:"a"},kind:"tube",name:"Feed line",group_ids:[]},
    {ref:{kind:"tube",id:"b"},kind:"tube",name:"Return",group_ids:["g2"]},
    {ref:{kind:"tube",id:"c"},kind:"tube",name:"Drain",group_ids:["g3"]}
  ];
  assert.deepEqual(evaluateDynamicSelectionSet(set,candidates).map(ref=>ref.id),["a","b"]);
  updateDynamicSelectionSetRules(project,set.id,{match:"all",rules:[
    {field:"kind",operator:"eq",value:"tube"},
    {field:"name",operator:"starts_with",value:"Ret"}
  ]});
  assert.deepEqual(evaluateDynamicSelectionSet(set,candidates).map(ref=>ref.id),["b"]);
});

test("question 107: pruning only affects Static Sets because Dynamic Sets are recomputed",()=>{
  const project={};
  const stat=createSelectionSet(project,{name:"Static",members:[{kind:"tube",id:"gone"}]});
  const dyn=createDynamicSelectionSet(project,{name:"Dynamic",rules:{match:"all",rules:[{field:"kind",operator:"eq",value:"tube"}]}});
  const removed=pruneSelectionSetMembers(project,()=>false);
  assert.equal(removed.length,1);
  assert.deepEqual(stat.members,[]);
  assert.equal(dyn.kind,"DynamicSelectionSet");
  assert.equal("members" in dyn,false);
});
