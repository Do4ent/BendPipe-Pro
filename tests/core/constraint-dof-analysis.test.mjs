import test from "node:test";
import assert from "node:assert/strict";
import {analyzeConstraintDoF,dofLabel} from "../../src/domain/constraints/constraint-dof-analysis.mjs";

const ref=(object_id)=>({object_id});
const con=(id,type,status="Valid",refs=[ref("A")])=>({id,type,status,enabled:true,driving:true,references:refs});

test("question 81: unconstrained selected object exposes six rigid DoF",()=>{
  const a=analyzeConstraintDoF({geometric_constraints:[]},{object_ids:["A"]});
  assert.equal(a.status,"Under-constrained");
  assert.equal(a.total_dof,6);
  assert.equal(a.remaining_dof,6);
  assert.deepEqual(a.objects[0].free_translation,["Tx","Ty","Tz"]);
  assert.deepEqual(a.objects[0].free_rotation,["Rx","Ry","Rz"]);
});

test("question 81: FixedPoint leaves rotations and FixedGeometry fully constrains object",()=>{
  const point=analyzeConstraintDoF({geometric_constraints:[con("p","FixedPoint")]},{object_ids:["A"]});
  assert.equal(point.status,"Under-constrained");
  assert.equal(point.remaining_dof,3);
  assert.deepEqual(point.objects[0].free_rotation,["Rx","Ry","Rz"]);

  const fixed=analyzeConstraintDoF({geometric_constraints:[con("g","FixedGeometry")]},{object_ids:["A"]});
  assert.equal(fixed.status,"Fully constrained");
  assert.equal(fixed.remaining_dof,0);
  assert.equal(fixed.structural_rank,6);
});

test("question 81: relative Coincident constrains three of twelve two-object DoF",()=>{
  const a=analyzeConstraintDoF({geometric_constraints:[con("c","Coincident","Valid",[ref("A"),ref("B")])]},{object_ids:["A","B"]});
  assert.equal(a.status,"Under-constrained");
  assert.equal(a.total_dof,12);
  assert.equal(a.structural_rank,3);
  assert.equal(a.remaining_dof,9);
});

test("question 81: redundant independent-equation duplicates are Over-constrained",()=>{
  const a=analyzeConstraintDoF({geometric_constraints:[
    con("p1","FixedPoint"),con("p2","FixedPoint")
  ]},{object_ids:["A"]});
  assert.equal(a.status,"Over-constrained");
  assert.ok(a.redundant_constraint_ids.includes("p2")||a.redundant_constraint_ids.includes("p1"));
  assert.match(a.reasons.join(" "),/избыточные/i);
});

test("question 81: conflicts produce Over-constrained and lost references produce Invalid",()=>{
  const over=analyzeConstraintDoF({geometric_constraints:[con("x","Parallel","Conflict",[ref("A"),ref("B")])]},{object_ids:["A","B"]});
  assert.equal(over.status,"Over-constrained");
  assert.deepEqual(over.conflict_constraint_ids,["x"]);
  const invalid=analyzeConstraintDoF({geometric_constraints:[con("bad","Coincident","LostReference",[ref("A"),ref("B")])]},{object_ids:["A","B"]});
  assert.equal(invalid.status,"Invalid");
  assert.deepEqual(invalid.invalid_constraint_ids,["bad"]);
});

test("question 81: DoF labels are user-facing movement rotation parameter names",()=>{
  assert.equal(dofLabel("Tx"),"Move X");
  assert.equal(dofLabel("Rz"),"Rotate Z");
  assert.equal(dofLabel("Scalar"),"Parameter");
});
