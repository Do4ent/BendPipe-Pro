import test from "node:test";
import assert from "node:assert/strict";

import { canonicalizeTubeCandidate } from "../../src/recognition/canonicalize-tube-candidate.mjs";

function validInput(){
  return {
    tube_id:"tube-1",
    part_number:"10157549",
    descriptor:{
      status:"exact",
      w3d:{scale_mm_per_source_unit:10,polygon_handedness:"left"}
    },
    transform_provenance:{
      status:"rigid_placement",
      intrinsic_geometry_invariants_preserved:true,
      transform_count:2
    },
    geometry:{
      status:"geometry_candidate",
      include_library:"?Include Library/69646",
      selected_mesh_source_offset:15611700,
      source_scale_status:"explicit_source",
      source_scale_mm_per_source_unit:10,
      machine_compensation_applied:false,
      topology:{status:"candidate_valid"},
      length_consistency:{
        status:"passed",
        reconstructed_developed_length_mm:100
      },
      neutral_bend_sequence:{
        status:"candidate",
        bend_count:0,
        bends:[]
      },
      segmentation:{
        primitive_count:1,
        primitives:[{
          source_start_index:0,
          source_end_index:1,
          primitive:{
            type:"LINE",
            start:[0,0,0],
            end:[100,0,0],
            direction:[1,0,0],
            length_mm:100
          }
        }]
      }
    }
  };
}

test("A20: guarded pipeline returns canonical geometry only after promotion passes",()=>{
  const result=canonicalizeTubeCandidate(validInput());
  assert.equal(result.status,"canonical_candidate");
  assert.equal(result.canonical_ready,true);
  assert.equal(result.production_ready,false);
  assert.equal(result.promotion.status,"canonical_candidate");
  assert.equal(result.canonical_geometry.tube_id,"tube-1");
  assert.equal(result.canonical_geometry.primitives.length,1);
  assert.equal(result.canonical_geometry.primitives[0].type,"LINE");
});

test("A20: blocked promotion yields no canonical geometry object",()=>{
  const input=validInput();
  input.transform_provenance.status="blocked";
  input.transform_provenance.intrinsic_geometry_invariants_preserved=false;
  const result=canonicalizeTubeCandidate(input);
  assert.equal(result.status,"blocked");
  assert.equal(result.canonical_ready,false);
  assert.equal(result.canonical_geometry,null);
  assert.ok(result.promotion.blockers.length>0);
});

test("A20: scale mismatch cannot be bypassed through composed pipeline",()=>{
  const input=validInput();
  input.geometry.source_scale_mm_per_source_unit=9.5;
  const result=canonicalizeTubeCandidate(input);
  assert.equal(result.status,"blocked");
  assert.equal(result.canonical_geometry,null);
  assert.ok(result.promotion.blockers.some((x)=>/scale/i.test(x)));
});
