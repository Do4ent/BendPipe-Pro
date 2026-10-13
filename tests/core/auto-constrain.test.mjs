import test from "node:test";
import assert from "node:assert/strict";
import {buildAutoConstrainPlan,filterAutoConstrainPlan,relationKeyForConstraint} from "../../src/domain/constraints/auto-constrain.mjs";

const ref=(object_id,subentity_id)=>({object_id,subentity_id});

test("question 82: Auto-Constrain always returns preview and never numeric Driving Dimensions",()=>{
  const refs=[ref("A","line")];
  const plan=buildAutoConstrainPlan({
    project:{geometric_constraints:[]},
    references:refs,
    resolved:[{direction:{x:1,y:0,z:0}}]
  });
  assert.equal(plan.status,"Preview");
  assert.equal(plan.requires_confirmation,true);
  assert.equal(plan.creates_numeric_driving_dimensions,false);
  assert.ok(plan.suggestions.some(item=>item.type==="Horizontal"));
});

test("question 82: planner keeps only constraints that reduce structural DoF",()=>{
  const refs=[ref("A","line"),ref("B","line")];
  const plan=buildAutoConstrainPlan({
    project:{geometric_constraints:[]},
    references:refs,
    resolved:[
      {point:{x:0,y:0,z:0},direction:{x:1,y:0,z:0}},
      {point:{x:10,y:0,z:0},direction:{x:1,y:0,z:0}}
    ]
  });
  assert.ok(plan.dof_reduction>0);
  assert.ok(plan.dof_after.structural_rank>plan.dof_before.structural_rank);
  assert.ok(plan.suggestions.every(item=>item.rank_gain>0));
});

test("question 82: existing equivalent constraint is skipped",()=>{
  const refs=[ref("A","line")];
  const plan=buildAutoConstrainPlan({
    project:{geometric_constraints:[{id:"h",type:"Horizontal",status:"Valid",enabled:true,driving:true,references:refs}]},
    references:refs,
    resolved:[{direction:{x:1,y:0,z:0}}]
  });
  assert.equal(plan.suggestions.some(item=>item.type==="Horizontal"),false);
  assert.ok(plan.skipped.some(item=>item.reason==="Already constrained"));
});

test("question 82: system relation keys are excluded from Auto-Constrain",()=>{
  const refs=[ref("A","p1"),ref("A","p2")];
  const key=relationKeyForConstraint("Coincident",refs);
  const plan=buildAutoConstrainPlan({
    project:{geometric_constraints:[]},
    references:refs,
    resolved:[{point:{x:0,y:0,z:0}},{point:{x:0,y:0,z:0}}],
    system_relation_keys:[key]
  });
  assert.equal(plan.suggestions.some(item=>item.type==="Coincident"),false);
  assert.ok(plan.skipped.some(item=>item.reason==="System relation"));
});

test("question 82: user can filter preview before confirmation",()=>{
  const refs=[ref("A","line")];
  const plan=buildAutoConstrainPlan({
    project:{geometric_constraints:[]},
    references:refs,
    resolved:[{direction:{x:1,y:0,z:0}}]
  });
  const selected=plan.suggestions.slice(0,1).map(item=>item.id);
  const filtered=filterAutoConstrainPlan(plan,selected);
  assert.equal(filtered.suggestions.length,selected.length);
  assert.equal(filtered.requires_confirmation,true);
  assert.equal(filtered.creates_numeric_driving_dimensions,false);
});
