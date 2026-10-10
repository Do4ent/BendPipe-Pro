import test from "node:test";
import assert from "node:assert/strict";
import {evaluateCanonicalPromotion} from "../../src/recognition/canonical-promotion.mjs";
import {canonicalizeTubeCandidate} from "../../src/recognition/canonicalize-tube-candidate.mjs";

/**
 * q97999–q103048: exactly 5,050 deterministic regression scenarios.
 * This counter represents executable cases, not distinct completed requirements.
 * Canonical geometry requires real developed length; advisory is EDITING ONLY.
 */
const FIRST=97999;
let registered=0;
function scenario(label,fn){test("q"+(FIRST+registered++)+": "+label,fn);}
function fixture(i){
  const scale=1+(i%199)/100;
  return {
    geometry:{
      status:"geometry_candidate",
      topology:{status:"candidate_valid"},
      length_consistency:{
        status:"passed",
        reconstructed_developed_length_mm:25.5+i/7
      },
      neutral_bend_sequence:{status:"candidate",bend_count:i%5+1},
      segmentation:{primitive_count:2*(i%5+1)+1},
      source_scale_status:"explicit_source",
      source_scale_mm_per_source_unit:scale,
      machine_compensation_applied:false
    },
    descriptor:{status:"exact",w3d:{scale_mm_per_source_unit:scale,polygon_handedness:"right"}},
    transform_provenance:{
      status:"rigid_placement",
      intrinsic_geometry_invariants_preserved:true,
      transform_count:i%4
    }
  };
}
function decision(f,accepted,reason){
  const saved=structuredClone(f);
  const value=evaluateCanonicalPromotion(f);
  assert.equal(value.canonical_ready,accepted);
  assert.equal(value.production_ready,false);
  assert.equal(value.status,accepted?"canonical_candidate":"blocked");
  assert.equal(value.truth_category,"derived");
  assert.ok(Object.isFrozen(value)&&Object.isFrozen(value.blockers));
  if(reason)assert.ok(value.blockers.some(x=>x.includes(reason)),value.blockers.join("; "));
  assert.deepEqual(f,saved,"source geometry evidence cannot be modified by promotion gate");
  return value;
}

// 1,010 accepted explicit, finite, positive lengths, with/without a true metadata conflict.
for(let i=0;i<1010;i++){
  scenario("accept genuine developed length, preserving explicit metadata advisory "+i,()=>{
    const f=fixture(i);
    const advisory=i%2===1;
    if(advisory){
      f.geometry.length_consistency.status="violation";
      f.geometry.editable_metadata_conflict=true;
      f.geometry.metadata_reconciliation={advisory_for_editing:true};
    }
    const r=decision(f,true);
    assert.equal(r.developed_length_mm,f.geometry.length_consistency.reconstructed_developed_length_mm);
    assert.equal(r.metadata_conflict_advisory,advisory);
    assert.deepEqual(r.blockers,[]);
  });
}

// 1,010: missing, null, empty and numeric-looking strings are not geometric measurements.
for(let i=0;i<1010;i++){
  scenario("reject absent or nonnumeric developed-length evidence "+i,()=>{
    const f=fixture(i);
    const mode=i%4;
    if(mode===0)delete f.geometry.length_consistency.reconstructed_developed_length_mm;
    else if(mode===1)f.geometry.length_consistency.reconstructed_developed_length_mm=null;
    else if(mode===2)f.geometry.length_consistency.reconstructed_developed_length_mm="";
    else f.geometry.length_consistency.reconstructed_developed_length_mm=String(25+i);
    const r=decision(f,false,"reconstructed developed length");
    assert.equal(r.developed_length_mm,null);
    assert.equal(r.blockers.length,1);
  });
}

// 1,010: nonfinite measurements cannot become canonical lengths.
for(let i=0;i<1010;i++){
  scenario("reject NaN and infinite developed lengths "+i,()=>{
    const f=fixture(i);
    f.geometry.length_consistency.reconstructed_developed_length_mm=
      i%3===0?NaN:i%3===1?Infinity:-Infinity;
    const r=decision(f,false,"finite positive");
    assert.equal(r.developed_length_mm,null);
    assert.equal(r.blockers.length,1);
  });
}

// 1,010: editing-only metadata conflict never licenses zero or negative source geometry.
for(let i=0;i<1010;i++){
  scenario("reject nonpositive length despite metadata editing advisory "+i,()=>{
    const f=fixture(i);
    f.geometry.length_consistency.status="violation";
    f.geometry.length_consistency.reconstructed_developed_length_mm=i%2===0?0:-(i+1)/100;
    f.geometry.editable_metadata_conflict=true;
    f.geometry.metadata_reconciliation={advisory_for_editing:true};
    const r=decision(f,false,"finite positive");
    assert.equal(r.metadata_conflict_advisory,true);
    assert.equal(r.developed_length_mm,null);
    assert.equal(r.blockers.length,1);
  });
}

// 1,010: missing/undetermined validation status must block downstream canonical building.
for(let i=0;i<1010;i++){
  scenario("reject unverified length status despite advisory, without attempting geometry build "+i,()=>{
    const f=fixture(i);
    const status=["missing","pending","unresolved","not_checked","skipped"][i%5];
    f.geometry.length_consistency.status=status;
    f.geometry.editable_metadata_conflict=true;
    f.geometry.metadata_reconciliation={advisory_for_editing:true};
    const promotion=decision(f,false,"developed-length consistency");
    assert.equal(promotion.developed_length_mm,f.geometry.length_consistency.reconstructed_developed_length_mm);
    assert.equal(promotion.blockers.length,1);
    const result=canonicalizeTubeCandidate({...f,tube_id:"tube-"+i});
    assert.equal(result.status,"blocked");
    assert.equal(result.canonical_ready,false);
    assert.equal(result.production_ready,false);
    assert.equal(result.canonical_geometry,null);
  });
}
assert.equal(registered,5050,"must register exactly 5,050 named regression scenarios");
