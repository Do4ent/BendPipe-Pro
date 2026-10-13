import test from "node:test";
import assert from "node:assert/strict";
import {
  GEOMETRIC_CONSTRAINT_TYPES,
  createGeometricConstraint,
  evaluateGeometricConstraint,
  geometricConstraintSolvePlan,
  ensureConstraintState,
  upsertGeometricConstraint,
  removeGeometricConstraint
} from "../../src/domain/constraints/geometric-constraints.mjs";

const resolver=(map)=>(ref)=>map[ref.object_id]??null;
const c=(type,references,target=null)=>createGeometricConstraint({type,references:references.map(object_id=>({object_id})),target});
const ok=(constraint,map)=>evaluateGeometricConstraint(constraint,{resolveReference:resolver(map)});

test("question 79: full accepted geometric Constraint set is present",()=>{
  assert.deepEqual(Array.from(GEOMETRIC_CONSTRAINT_TYPES),[
    "Coincident","Collinear","Parallel","Perpendicular","Tangent","Concentric","Equal",
    "Horizontal","Vertical","FixedDirection","FixedPoint","FixedGeometry"
  ]);
});

test("question 79: Coincident Collinear Parallel Perpendicular evaluate exactly",()=>{
  assert.equal(ok(c("Coincident",["a","b"]),{a:{point:{x:1,y:2,z:3}},b:{point:{x:1,y:2,z:3}}}).status,"Valid");
  assert.equal(ok(c("Collinear",["a","b"]),{
    a:{point:{x:0,y:0,z:0},direction:{x:1,y:0,z:0}},
    b:{point:{x:10,y:0,z:0},direction:{x:-1,y:0,z:0}}
  }).status,"Valid");
  assert.equal(ok(c("Parallel",["a","b"]),{a:{direction:{x:1,y:0,z:0}},b:{direction:{x:-1,y:0,z:0}}}).status,"Valid");
  assert.equal(ok(c("Perpendicular",["a","b"]),{a:{direction:{x:1,y:0,z:0}},b:{direction:{x:0,y:1,z:0}}}).status,"Valid");
});

test("question 79: Tangent Concentric Equal evaluate exact geometry",()=>{
  assert.equal(ok(c("Tangent",["a","b"]),{
    a:{center:{x:0,y:0,z:0},radius_mm:10},
    b:{center:{x:15,y:0,z:0},radius_mm:5}
  }).status,"Valid");
  assert.equal(ok(c("Concentric",["a","b"]),{
    a:{center:{x:3,y:4,z:5},radius_mm:10},
    b:{center:{x:3,y:4,z:5},radius_mm:2}
  }).status,"Valid");
  assert.equal(ok(c("Equal",["a","b"]),{a:{length_mm:25},b:{value:25}}).status,"Valid");
});

test("question 79: Horizontal Vertical Fixed Direction Point Geometry work",()=>{
  assert.equal(ok(c("Horizontal",["a"]),{a:{direction:{x:-1,y:0,z:0}}}).status,"Valid");
  assert.equal(ok(c("Vertical",["a"]),{a:{direction:{x:0,y:1,z:0}}}).status,"Valid");
  assert.equal(ok(c("FixedDirection",["a"],{direction:{x:0,y:0,z:1}}),{a:{direction:{x:0,y:0,z:-1}}}).status,"Valid");
  assert.equal(ok(c("FixedPoint",["a"],{point:{x:2,y:3,z:4}}),{a:{point:{x:2,y:3,z:4}}}).status,"Valid");
  assert.equal(ok(c("FixedGeometry",["a"],{signature:{kind:"line",L:100}}),{a:{signature:{kind:"line",L:100}}}).status,"Valid");
});

test("question 79: conflicts and missing geometry fail closed",()=>{
  assert.equal(ok(c("Coincident",["a","b"]),{a:{point:{x:0,y:0,z:0}},b:{point:{x:1,y:0,z:0}}}).status,"Conflict");
  assert.equal(ok(c("Parallel",["a","b"]),{a:{direction:{x:1,y:0,z:0}},b:{direction:{x:0,y:1,z:0}}}).status,"Conflict");
  assert.equal(ok(c("Coincident",["a","missing"]),{a:{point:{x:0,y:0,z:0}}}).status,"LostReference");
  const unresolved=ok(c("Tangent",["a","b"]),{a:{foo:true},b:{bar:true}});
  assert.equal(unresolved.status,"Error");
  assert.equal(unresolved.ok,false);
});

test("question 79: solve plan refuses unsupported conflict without solver",()=>{
  const constraint=c("Coincident",["a","b"]);
  const plan=geometricConstraintSolvePlan(constraint,{resolveReference:resolver({
    a:{point:{x:0,y:0,z:0}},b:{point:{x:10,y:0,z:0}}
  })});
  assert.equal(plan.ok,false);
  assert.equal(plan.status,"Conflict");
  assert.match(plan.reason,/No geometric constraint solver/);
});

test("question 79: project storage upserts and removes constraints by stable id",()=>{
  const project={};
  assert.deepEqual(ensureConstraintState(project),[]);
  const first=upsertGeometricConstraint(project,{id:"c1",type:"FixedPoint",references:[{object_id:"a"}],target:{point:{x:0,y:0,z:0}}});
  assert.equal(first.id,"c1");
  upsertGeometricConstraint(project,{id:"c1",type:"FixedPoint",name:"Anchor",references:[{object_id:"a"}],target:{point:{x:1,y:0,z:0}}});
  assert.equal(project.geometric_constraints.length,1);
  assert.equal(project.geometric_constraints[0].name,"Anchor");
  assert.equal(removeGeometricConstraint(project,"c1"),true);
  assert.equal(project.geometric_constraints.length,0);
});
