import test from "node:test";
import assert from "node:assert/strict";
import {evaluateCanonicalPromotion} from "../../src/recognition/canonical-promotion.mjs";

/**
 * q92949–q97998: 5,050 deterministic source-scale validation regressions.
 * These numbers identify executable scenarios, not completed product features.
 */
const START=92949;
let registered=0;
function scenario(label,fn){test("q"+(START+registered++)+": "+label,fn);}
function fixture(i){
  const scale=(i+1)/1000;
  return {
    geometry:{
      status:"geometry_candidate",topology:{status:"candidate_valid"},
      length_consistency:{status:"passed",reconstructed_developed_length_mm:100+i},
      neutral_bend_sequence:{status:"candidate",bend_count:1},
      segmentation:{primitive_count:3},
      source_scale_status:"explicit_source",
      source_scale_mm_per_source_unit:scale,
      machine_compensation_applied:false
    },
    descriptor:{status:"exact",w3d:{scale_mm_per_source_unit:scale,polygon_handedness:"right"}},
    transform_provenance:{status:"rigid_placement",intrinsic_geometry_invariants_preserved:true,transform_count:1}
  };
}
function verdict(input,allowed,expectedBlocker){
  const before=structuredClone(input);
  const r=evaluateCanonicalPromotion(input);
  assert.equal(r.canonical_ready,allowed);
  assert.equal(r.status,allowed?"canonical_candidate":"blocked");
  assert.equal(r.production_ready,false);
  assert.equal(r.truth_category,"derived");
  assert.equal(r.blockers.length,allowed?0:1);
  if(expectedBlocker)assert.ok(r.blockers.some(s=>s.includes(expectedBlocker)),r.blockers.join(" | "));
  assert.ok(Object.isFrozen(r)&&Object.isFrozen(r.blockers));
  assert.deepEqual(input,before,"validation must not mutate input evidence");
}
// 1,010: valid finite positive values including small scales.
for(let i=0;i<1010;i++){
  scenario("accept exact finite positive source scale "+i,()=>{
    const f=fixture(i);verdict(f,true);
  });
}
// 1,010: undefined and null source-scale evidence must not pass because NaN comparisons are false.
for(let i=0;i<1010;i++){
  scenario("reject missing explicit source-scale value "+i,()=>{
    const f=fixture(i);
    if(i%2===0)delete f.geometry.source_scale_mm_per_source_unit;
    else f.geometry.source_scale_mm_per_source_unit=null;
    verdict(f,false,"finite positive");
  });
}
// 1,010: NaN and +/-Infinity are invalid even with explicit_source status.
for(let i=0;i<1010;i++){
  scenario("reject nonfinite source scale "+i,()=>{
    const f=fixture(i);
    f.geometry.source_scale_mm_per_source_unit=i%3===0?NaN:i%3===1?Infinity:-Infinity;
    const r=evaluateCanonicalPromotion(f);
    assert.equal(r.canonical_ready,false);
    assert.equal(r.production_ready,false);
    assert.ok(r.blockers.some(s=>s.includes("finite positive")));
  });
}
// 1,010: zero/negative units cannot be used as explicit geometry scale.
for(let i=0;i<1010;i++){
  scenario("reject nonpositive source scale "+i,()=>{
    const f=fixture(i);
    f.geometry.source_scale_mm_per_source_unit=i%2===0?0:-(i+1)/1000;
    verdict(f,false,"finite positive");
  });
}
// 1,010: explicit but mismatched positive scale cannot silently pass.
for(let i=0;i<1010;i++){
  scenario("reject finite but mismatched source scale "+i,()=>{
    const f=fixture(i);
    f.geometry.source_scale_mm_per_source_unit+=0.01+(i%7)/1000;
    verdict(f,false,"scale does not match");
  });
}
assert.equal(registered,5050,"register exactly 5,050 executable scenarios");
