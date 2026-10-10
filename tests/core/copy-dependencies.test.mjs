import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCopyDependencyPlan,
  applyCopyDependencyPolicy,
  applyCopyDependencyBatch
} from "../../src/domain/editing/copy-dependencies.mjs";

function tube(id,target){
  return {
    id,
    engineering:{ports:{
      P1:{ownerObjectId:"",externalRefId:""},
      P2:{ownerObjectId:target,externalRefId:target}
    }}
  };
}

test("question 92: copy plan separates internal and external dependencies",()=>{
  const a=tube("A","B"),b=tube("B","X");
  const plan=buildCopyDependencyPlan([a,b]);
  assert.ok(plan.internal.some(dep=>dep.source_id==="A"&&dep.target_id==="B"));
  assert.ok(plan.external.some(dep=>dep.source_id==="B"&&dep.target_id==="X"));
  assert.equal(plan.requires_external_choice,true);
});

test("question 92: external dependencies fail closed until user chooses",()=>{
  const source=tube("A","X"),plan=buildCopyDependencyPlan([source]);
  const copy=structuredClone(source);copy.__copy_source_id="A";copy.id="A2";
  assert.throws(
    ()=>applyCopyDependencyPolicy(copy,new Map([["A","A2"]]),plan),
    error=>error?.code==="EXTERNAL_DEPENDENCY_CHOICE_REQUIRED"
  );
});

test("question 92: internal dependencies always remap to copied targets",()=>{
  const a=tube("A","B"),b=tube("B","");
  const plan=buildCopyDependencyPlan([a,b]);
  const ca=structuredClone(a),cb=structuredClone(b);
  ca.__copy_source_id="A";ca.id="A2";cb.__copy_source_id="B";cb.id="B2";
  applyCopyDependencyBatch([ca,cb],new Map([["A","A2"],["B","B2"]]),plan,{external_policy:null});
  assert.equal(ca.engineering.ports.P2.ownerObjectId,"B2");
  assert.equal(ca.engineering.ports.P2.externalRefId,"B2");
});

test("question 92: Detach explicitly removes external dependencies",()=>{
  const source=tube("A","X"),plan=buildCopyDependencyPlan([source]);
  const copy=structuredClone(source);copy.__copy_source_id="A";copy.id="A2";
  applyCopyDependencyPolicy(copy,new Map([["A","A2"]]),plan,{external_policy:"Detach"});
  assert.equal(copy.engineering.ports.P2.ownerObjectId,"");
  assert.equal(copy.engineering.ports.P2.externalRefId,"");
});

test("question 92: Keep explicitly retains external dependencies",()=>{
  const source=tube("A","X"),plan=buildCopyDependencyPlan([source]);
  const copy=structuredClone(source);copy.__copy_source_id="A";copy.id="A2";
  applyCopyDependencyPolicy(copy,new Map([["A","A2"]]),plan,{external_policy:"Keep"});
  assert.equal(copy.engineering.ports.P2.ownerObjectId,"X");
  assert.equal(copy.engineering.ports.P2.externalRefId,"X");
});

test("question 92: dimension references follow the same policy",()=>{
  const dim={id:"D",references:[{object_id:"A"},{object_id:"X"}]};
  const tubeA={id:"A"};
  const plan=buildCopyDependencyPlan([dim,tubeA]);
  const copy=structuredClone(dim);copy.__copy_source_id="D";copy.id="D2";
  applyCopyDependencyPolicy(copy,new Map([["D","D2"],["A","A2"]]),plan,{external_policy:"Detach"});
  assert.equal(copy.references[0].object_id,"A2");
  assert.equal(copy.references[1].object_id,"");
});
