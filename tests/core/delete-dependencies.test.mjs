import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeDeletionDependencies,
  applyDeletionDependencyStrategy,
  dependencySummary
} from "../../src/domain/project/delete-dependencies.mjs";

function projectFixture(){
  return {
    tubes:[
      {id:"A",engineering:{ports:{P1:{},P2:{}}}},
      {id:"B",engineering:{ports:{P1:{},P2:{ownerObjectId:"A",externalRefId:"A",locked:true}}}},
      {id:"C",engineering:{ports:{P1:{},P2:{}}}}
    ],
    engineering_dimensions:[{id:"D1",references:[{object_id:"A"},{object_id:"C"}]}],
    geometric_constraints:[{id:"K1",references:[{object_id:"A"},{object_id:"C"}],enabled:true,status:"Valid"}],
    groups:[{id:"G1",members:[{kind:"tube",id:"A"},{kind:"tube",id:"C"}]}],
    assemblies:[{id:"AS1",members:[{ref:{kind:"tube",id:"A"}},{ref:{kind:"tube",id:"C"}}]}],
    associative_arrays:[{id:"AR1",source_tube_ids:["A"],status:"Valid"}],
    associative_mirrors:[{id:"M1",source_tube_id:"A",status:"Valid"}],
    associative_transform_stacks:[{id:"S1",object_id:"A",state:"Valid"}]
  };
}

test("question 93: safe delete scanner finds all supported dependent relation classes",()=>{
  const p=projectFixture();
  const analysis=analyzeDeletionDependencies(p,["A"]);
  assert.equal(analysis.has_dependencies,true);
  const relations=new Set(analysis.dependencies.map(x=>x.relation));
  for(const relation of ["TubePort","DimensionReference","ConstraintReference","GroupMember","AssemblyMember","ArraySource","MirrorSource","TransformStackObject"]){
    assert.ok(relations.has(relation),relation);
  }
  assert.equal(dependencySummary(analysis).count,analysis.dependencies.length);
});

test("question 93: dependency between objects deleted together does not block the batch",()=>{
  const p=projectFixture();
  const analysis=analyzeDeletionDependencies(p,["A","B"]);
  assert.equal(analysis.dependencies.some(x=>x.relation==="TubePort"&&x.dependent_id==="B"),false);
});

test("question 93: Cancel is fail-closed and mutates nothing",()=>{
  const p=projectFixture(),before=structuredClone(p);
  const analysis=analyzeDeletionDependencies(p,["A"]);
  const result=applyDeletionDependencyStrategy(p,analysis,{strategy:"Cancel"});
  assert.equal(result.ok,false);
  assert.deepEqual(p,before);
});

test("question 93: Detach preserves dependents while removing broken references",()=>{
  const p=projectFixture(),analysis=analyzeDeletionDependencies(p,["A"]);
  const result=applyDeletionDependencyStrategy(p,analysis,{strategy:"Detach"});
  assert.equal(result.ok,true);
  assert.equal(p.tubes.find(x=>x.id==="B").engineering.ports.P2.ownerObjectId,"");
  assert.equal(p.tubes.find(x=>x.id==="B").engineering.ports.P2.externalRefId,"");
  assert.equal(p.tubes.find(x=>x.id==="B").engineering.ports.P2.locked,false);
  assert.deepEqual(p.engineering_dimensions[0].references,[{object_id:"C"}]);
  assert.equal(p.geometric_constraints[0].enabled,false);
  assert.equal(p.groups[0].members.some(x=>x.id==="A"),false);
  assert.equal(p.assemblies[0].members.some(x=>x.ref?.id==="A"),false);
  assert.equal(p.associative_arrays[0].status,"LostSource");
  assert.equal(p.associative_mirrors[0].status,"LostSource");
  assert.equal(p.associative_transform_stacks[0].state,"LostSource");
});

test("question 93: Reassign retargets every supported dependency",()=>{
  const p=projectFixture(),analysis=analyzeDeletionDependencies(p,["A"]);
  const result=applyDeletionDependencyStrategy(p,analysis,{strategy:"Reassign",replacement_by_target:{A:"C"}});
  assert.equal(result.ok,true);
  assert.equal(p.tubes.find(x=>x.id==="B").engineering.ports.P2.ownerObjectId,"C");
  assert.ok(p.engineering_dimensions[0].references.every(x=>x.object_id==="C"));
  assert.ok(p.geometric_constraints[0].references.every(x=>x.object_id==="C"));
  assert.equal(p.groups[0].members[0].id,"C");
  assert.equal(p.assemblies[0].members[0].ref.id,"C");
  assert.deepEqual(p.associative_arrays[0].source_tube_ids,["C"]);
  assert.equal(p.associative_mirrors[0].source_tube_id,"C");
  assert.equal(p.associative_transform_stacks[0].object_id,"C");
});

test("question 93: Reassign requires an explicit replacement",()=>{
  const p=projectFixture(),analysis=analyzeDeletionDependencies(p,["A"]);
  assert.throws(
    ()=>applyDeletionDependencyStrategy(p,analysis,{strategy:"Reassign"}),
    error=>error?.code==="DELETE_REASSIGN_TARGET_REQUIRED"
  );
});

test("question 93: Cascade deletes true dependent objects and definitions but preserves container structures",()=>{
  const p=projectFixture(),analysis=analyzeDeletionDependencies(p,["A"]);
  const result=applyDeletionDependencyStrategy(p,analysis,{strategy:"Cascade"});
  assert.equal(result.ok,true);
  assert.equal(p.tubes.some(x=>x.id==="B"),false);
  assert.equal(p.engineering_dimensions.some(x=>x.id==="D1"),false);
  assert.equal(p.geometric_constraints.some(x=>x.id==="K1"),false);
  assert.equal(p.associative_arrays.some(x=>x.id==="AR1"),false);
  assert.equal(p.associative_mirrors.some(x=>x.id==="M1"),false);
  assert.equal(p.associative_transform_stacks.some(x=>x.id==="S1"),false);
  assert.equal(p.groups.some(x=>x.id==="G1"),true);
  assert.equal(p.groups[0].members.some(x=>x.id==="A"),false);
  assert.equal(p.assemblies.some(x=>x.id==="AS1"),true);
  assert.equal(p.assemblies[0].members.some(x=>x.ref?.id==="A"),false);
});
