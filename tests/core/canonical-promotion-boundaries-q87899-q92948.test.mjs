import test from "node:test";
import assert from "node:assert/strict";
import {evaluateCanonicalPromotion} from "../../src/recognition/canonical-promotion.mjs";

/**
 * Checkpoint q87899–q92948: 5,050 deterministic regression scenarios.
 * This is a SCENARIO counter, not a count of implemented product requirements.
 * Focus: exact scale, provenance, compensation separation and advisory metadata.
 */
const FIRST=87899;
let scenarios=0;
function caseTest(title,callback){
  test(`q${FIRST+scenarios++}: ${title}`,callback);
}
function fixture(i){
  const scale=0.2+i/1000;
  return {
    geometry:{
      status:"geometry_candidate",
      source_scale_status:"explicit_source",
      source_scale_mm_per_source_unit:scale,
      topology:{status:"candidate_valid"},
      length_consistency:{status:"passed",reconstructed_developed_length_mm:50+i/10},
      neutral_bend_sequence:{status:"candidate",bend_count:i%8+1},
      segmentation:{primitive_count:i%8*2+3},
      machine_compensation_applied:false
    },
    descriptor:{status:"exact",w3d:{scale_mm_per_source_unit:scale,polygon_handedness:"left"}},
    transform_provenance:{
      status:"rigid_placement",intrinsic_geometry_invariants_preserved:true,transform_count:i%5
    }
  };
}
for(let i=0;i<1010;i++){
  caseTest("accepted exact nominal geometry with varied scales "+i,()=>{
    const source=fixture(i);
    const snapshot=structuredClone(source);
    const result=evaluateCanonicalPromotion(source);
    assert.equal(result.status,"canonical_candidate");
    assert.equal(result.canonical_ready,true);
    assert.equal(result.production_ready,false);
    assert.equal(result.truth_category,"derived");
    assert.equal(result.source_scale_mm_per_source_unit,source.descriptor.w3d.scale_mm_per_source_unit);
    assert.equal(result.bend_count,source.geometry.neutral_bend_sequence.bend_count);
    assert.equal(result.transform_count,source.transform_provenance.transform_count);
    assert.equal(result.blockers.length,0);
    assert.ok(Object.isFrozen(result)&&Object.isFrozen(result.blockers));
    assert.deepEqual(source,snapshot);
  });
}
for(let i=0;i<1010;i++){
  caseTest("exact descriptor rejects source-scale mismatch "+i,()=>{
    const source=fixture(i);
    source.geometry.source_scale_mm_per_source_unit+=0.00001+(i%11)/10000;
    const result=evaluateCanonicalPromotion(source);
    assert.equal(result.status,"blocked");
    assert.equal(result.canonical_ready,false);
    assert.equal(result.production_ready,false);
    assert.ok(result.blockers.some(x=>x.includes("scale does not match")));
  });
}
for(let i=0;i<1010;i++){
  caseTest("machine/tool compensation cannot enter nominal geometry "+i,()=>{
    const source=fixture(i);
    source.geometry.machine_compensation_applied=i%2===0?true:null;
    const result=evaluateCanonicalPromotion(source);
    assert.equal(result.status,"blocked");
    assert.equal(result.canonical_ready,false);
    assert.equal(result.production_ready,false);
    assert.ok(result.blockers.some(x=>x.includes("compensation")));
  });
}
for(let i=0;i<1010;i++){
  caseTest("unverified transform invariants block canonical promotion "+i,()=>{
    const source=fixture(i);
    if(i%2===0)source.transform_provenance.status="non_rigid";
    else source.transform_provenance.intrinsic_geometry_invariants_preserved=false;
    const result=evaluateCanonicalPromotion(source);
    assert.equal(result.canonical_ready,false);
    assert.equal(result.production_ready,false);
    assert.ok(result.blockers.some(x=>x.includes("transform")||x.includes("placement")));
  });
}
for(let i=0;i<1010;i++){
  caseTest("editable metadata-conflict advisory never permits production "+i,()=>{
    const source=fixture(i);
    source.geometry.length_consistency.status="violation";
    source.geometry.editable_metadata_conflict=true;
    source.geometry.metadata_reconciliation={advisory_for_editing:i%2===0};
    const result=evaluateCanonicalPromotion(source);
    const editable=i%2===0;
    assert.equal(result.canonical_ready,editable);
    assert.equal(result.status,editable?"canonical_candidate":"blocked");
    assert.equal(result.metadata_conflict_advisory,editable);
    assert.equal(result.production_ready,false);
    assert.equal(result.blockers.length,editable?0:1);
  });
}
assert.equal(scenarios,5050,"checkpoint scenario numbering must be exact");
