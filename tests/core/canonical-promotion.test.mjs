import test from "node:test";
import assert from "node:assert/strict";

import { evaluateCanonicalPromotion } from "../../src/recognition/canonical-promotion.mjs";

function fixture(){
  return {
    geometry:{
      status:"geometry_candidate",
      include_library:"?Include Library/46910",
      source_scale_status:"explicit_source",
      source_scale_mm_per_source_unit:10,
      topology:{status:"candidate_valid"},
      length_consistency:{
        status:"passed",
        reconstructed_developed_length_mm:1214.6
      },
      neutral_bend_sequence:{
        status:"candidate",
        bend_count:6
      },
      segmentation:{
        primitive_count:13,
        primitives:Array.from({length:13},()=>({}))
      },
      machine_compensation_applied:false
    },
    descriptor:{
      status:"exact",
      w3d:{
        scale_mm_per_source_unit:10,
        polygon_handedness:"right"
      }
    },
    transform_provenance:{
      status:"rigid_placement",
      intrinsic_geometry_invariants_preserved:true,
      transform_count:2
    }
  };
}

test("A20: exact scale, validated geometry and rigid placement permit canonical candidate",()=>{
  const input=fixture();
  const result=evaluateCanonicalPromotion(input);

  assert.equal(result.status,"canonical_candidate");
  assert.equal(result.canonical_ready,true);
  assert.equal(result.production_ready,false);
  assert.equal(result.source_scale_mm_per_source_unit,10);
  assert.equal(result.polygon_handedness,"right");
  assert.equal(result.geometry_include_library,"?Include Library/46910");
  assert.equal(result.primitive_count,13);
  assert.equal(result.bend_count,6);
  assert.equal(result.developed_length_mm,1214.6);
  assert.equal(result.transform_count,2);
  assert.deepEqual(result.blockers,[]);
});

test("A20: OD-derived fallback scale cannot silently promote canonical geometry",()=>{
  const input=fixture();
  input.geometry.source_scale_status="derived_fallback";
  input.geometry.source_scale_mm_per_source_unit=10;

  const result=evaluateCanonicalPromotion(input);
  assert.equal(result.status,"blocked");
  assert.equal(result.canonical_ready,false);
  assert.ok(result.blockers.some((x)=>/exact descriptor source scale/i.test(x)));
});

test("A20: descriptor/geometry scale mismatch blocks promotion",()=>{
  const input=fixture();
  input.geometry.source_scale_mm_per_source_unit=9.999;

  const result=evaluateCanonicalPromotion(input);
  assert.equal(result.status,"blocked");
  assert.ok(result.blockers.some((x)=>/does not match/i.test(x)));
});

test("A20: non-rigid placement blocks canonical intrinsic geometry",()=>{
  const input=fixture();
  input.transform_provenance.status="blocked";
  input.transform_provenance.intrinsic_geometry_invariants_preserved=false;

  const result=evaluateCanonicalPromotion(input);
  assert.equal(result.status,"blocked");
  assert.ok(result.blockers.some((x)=>/rigid_placement/i.test(x)));
  assert.ok(result.blockers.some((x)=>/intrinsic lengths/i.test(x)));
});

test("A20: developed-length violation blocks promotion even when topology passes",()=>{
  const input=fixture();
  input.geometry.length_consistency.status="violation";

  const result=evaluateCanonicalPromotion(input);
  assert.equal(result.status,"blocked");
  assert.ok(result.blockers.some((x)=>/developed-length consistency/i.test(x)));
});

test("A20: machine compensation cannot enter canonical nominal geometry",()=>{
  const input=fixture();
  input.geometry.machine_compensation_applied=true;

  const result=evaluateCanonicalPromotion(input);
  assert.equal(result.status,"blocked");
  assert.ok(result.blockers.some((x)=>/machine\/tool compensation/i.test(x)));
});
