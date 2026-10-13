import test from "node:test";
import assert from "node:assert/strict";
import {
  buildBatchNormalizePreview,
  setBatchPreviewSelection,
  setBatchNominal,
  batchNormalizePlan
} from "../../src/domain/geometry/batch-normalize-fitted.mjs";

const fitted=(id,value)=>({
  id,
  geometry_status:"Fitted",
  type:"LINE",
  length_mm:value,
  fitting_error:{mm:.01,deg:0},
  confidence:.9
});

test("question 88: preview groups similar Fitted values and separates distant nominals",()=>{
  const source=[fitted("a",100),fitted("b",100.04),fitted("c",100.08),fitted("d",200)];
  const before=structuredClone(source);
  const preview=buildBatchNormalizePreview(source,{
    tolerance_profile:{linear_tolerance_mm:.02},
    similarity_multiplier:5
  });
  assert.deepEqual(source,before,"preview must not mutate source");
  assert.equal(preview.status,"Preview");
  assert.equal(preview.mutates_source,false);
  assert.equal(preview.groups.length,2);
  assert.equal(preview.groups[0].member_count,3);
  assert.ok(Math.abs(preview.groups[0].nominal_value-100.04)<1e-9);
  assert.equal(preview.groups[0].out_of_tolerance_count,2);
  assert.equal(preview.groups[1].nominal_value,200);
});

test("question 88: preview selection changes do not touch source geometry",()=>{
  const source=[fitted("a",10),fitted("b",10.02)];
  const preview=buildBatchNormalizePreview(source,{tolerance_profile:{linear_tolerance_mm:.01}});
  const next=setBatchPreviewSelection(preview,["b"],false);
  assert.equal(preview.selected_count,2);
  assert.equal(next.selected_count,1);
  assert.equal(next.groups.flatMap(g=>g.members).find(x=>x.id==="b").selected,false);
  assert.equal(source[1].length_mm,10.02);
});

test("question 88: nominal override recalculates deviations and out-of-tolerance flags",()=>{
  const preview=buildBatchNormalizePreview(
    [fitted("a",50),fitted("b",50.03)],
    {tolerance_profile:{linear_tolerance_mm:.02}}
  );
  const group=preview.groups[0];
  const next=setBatchNominal(preview,group.id,50);
  const b=next.groups[0].members.find(x=>x.id==="b");
  assert.ok(Math.abs(b.deviation-.03)<1e-9);
  assert.equal(b.out_of_tolerance,true);
});

test("question 88: apply plan contains only explicitly selected candidates",()=>{
  let preview=buildBatchNormalizePreview(
    [fitted("a",25),fitted("b",25.01),fitted("c",25.02)],
    {tolerance_profile:{linear_tolerance_mm:.02}}
  );
  preview=setBatchPreviewSelection(preview,["b"],false);
  const plan=batchNormalizePlan(preview);
  assert.equal(plan.status,"Ready");
  assert.equal(plan.operation,"BatchNormalizeFittedToExact");
  assert.equal(plan.source_mutation,false);
  assert.equal(plan.selected_count,2);
  assert.deepEqual(plan.items.map(x=>x.id),["a","c"]);
  assert.ok(plan.items.every(item=>Number.isFinite(item.target_value)));
});
