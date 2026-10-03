import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRequiredEndTrimPlan,
  createTrimOperation,
  createTrimPreference,
  setTrimPreference,
  stockLengthAfterTrim,
  validateTrimPlan
} from "../../src/domain/manufacturing/trim-cut.mjs";

test("Trim/Cut preference stores method, tolerance and manufacturing plane",()=>{
  const pref=createTrimPreference({
    end:"P1",method:"saw",tolerance_mm:0.25,
    plane:{mode:"explicit",point_mm:{x:0,y:0,z:0},normal:{x:1,y:0,z:0}}
  });
  assert.equal(pref.end,"P1");
  assert.equal(pref.method,"saw");
  assert.equal(pref.tolerance_mm,0.25);
  assert.deepEqual(pref.plane.normal,{x:1,y:0,z:0});
});

test("required trim plan removes automatic allowances plus setup extensions",()=>{
  const plan=buildRequiredEndTrimPlan({
    end_allowances:{startAllowance:10,endAllowance:5},
    setup_extensions:{start_mm:20,end_mm:15}
  });
  const p1=plan.operations.find((x)=>x.end==="P1");
  const p2=plan.operations.find((x)=>x.end==="P2");
  assert.equal(p1.remove_length_mm,30);
  assert.equal(p2.remove_length_mm,20);
  assert.equal(plan.required_removal_mm,50);
  assert.equal(plan.nominal_geometry_changed,false);
});

test("Trim/Cut operation is explicitly manufacturing-only",()=>{
  const op=createTrimOperation({end:"P2",remove_length_mm:12});
  assert.equal(op.manufacturing_only,true);
  assert.equal(op.nominal_geometry_changed,false);
  assert.equal(op.enabled,true);
});

test("zero required trim is a warning, not invented removal",()=>{
  const plan=buildRequiredEndTrimPlan();
  const result=validateTrimPlan(plan);
  assert.equal(result.ok,true);
  assert.equal(result.status,"Warning");
  assert.equal(plan.required_removal_mm,0);
});

test("stock length after trim removes only manufacturing allowances",()=>{
  const plan=buildRequiredEndTrimPlan({
    end_allowances:{startAllowance:10,endAllowance:5},
    setup_extensions:{start_mm:20,end_mm:15}
  });
  assert.equal(stockLengthAfterTrim(1050,plan),1000);
});

test("trim preferences do not mutate nominal rows",()=>{
  const tube={id:"tube",rows:[{type:"LINE",L:100}]};
  const next=setTrimPreference(tube,"P1",{method:"tube_cutter",tolerance_mm:0.2});
  assert.deepEqual(next.rows,tube.rows);
  assert.equal(next.trim_preferences.P1.method,"tube_cutter");
  assert.equal(next.manufacturing_calculation_state,"Stale");
});

test("negative trim removal is rejected",()=>{
  assert.throws(()=>createTrimOperation({end:"P1",remove_length_mm:-1}),/cannot be negative/);
});

test("explicit trim plane requires non-zero normal",()=>{
  assert.throws(()=>createTrimPreference({
    end:"P1",plane:{mode:"explicit",normal:{x:0,y:0,z:0}}
  }),/non-zero/);
});


test("trim plan includes explicit cut allowances",()=>{
  const plan=buildRequiredEndTrimPlan({
    end_allowances:{startAllowance:10,endAllowance:5},
    cut_allowances:{start_mm:3,end_mm:2},
    setup_extensions:{start_mm:20,end_mm:15}
  });
  assert.equal(plan.operations.find((x)=>x.end==="P1").remove_length_mm,33);
  assert.equal(plan.operations.find((x)=>x.end==="P2").remove_length_mm,22);
  assert.equal(plan.required_removal_mm,55);
  assert.equal(plan.p1_cut_allowance_mm,3);
  assert.equal(plan.p2_cut_allowance_mm,2);
});
