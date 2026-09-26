import test from "node:test";
import assert from "node:assert/strict";

import { buildCanonicalTubeGeometry } from "../../src/recognition/canonical-tube-builder.mjs";

function fixture(){
  return {
    tube_id:"10157546",
    part_number:"10157546",
    promotion:{
      status:"canonical_candidate",
      canonical_ready:true,
      polygon_handedness:"left"
    },
    geometry:{
      status:"geometry_candidate",
      include_library:"?Include Library/46910",
      selected_mesh_source_offset:12793080,
      machine_compensation_applied:false,
      segmentation:{
        primitives:[
          {source_start_index:0,source_end_index:1,primitive:{
            type:"LINE",
            start:[0,0,0],
            end:[10,0,0],
            direction:[1,0,0],
            length_mm:10,
            reason:"line evidence"
          }},
          {source_start_index:1,source_end_index:4,primitive:{
            type:"BEND",
            start_point:[10,0,0],
            end_point:[20,10,0],
            center:[10,10,0],
            plane_normal:[0,0,1],
            clr_mm:10,
            signed_sweep_deg:90,
            tangent_start:[1,0,0],
            tangent_end:[0,1,0],
            evidence_mode:"sampled_arc_with_ring_tangents",
            reason:"bend evidence"
          }},
          {source_start_index:4,source_end_index:5,primitive:{
            type:"LINE",
            start:[20,10,0],
            end:[20,30,0],
            direction:[0,1,0],
            length_mm:20,
            reason:"line evidence"
          }}
        ]
      },
      neutral_bend_sequence:{
        status:"candidate",
        bends:[{
          bend_number:1,
          source_primitive_index:1,
          rotation_from_previous_bend_deg:null
        }]
      }
    }
  };
}

test("A20: canonical builder emits schema-shaped LINE/BEND geometry with provenance",()=>{
  const result=buildCanonicalTubeGeometry(fixture());

  assert.equal(result.schema_version,"1.0.0");
  assert.equal(result.tube_id,"10157546");
  assert.equal(result.length_unit,"mm");
  assert.equal(result.angle_unit,"deg");
  assert.equal(result.coordinate_frame.handedness,"left");
  assert.equal(result.primitives.length,3);
  assert.equal(result.primitives[0].type,"LINE");
  assert.equal(result.primitives[1].type,"BEND");
  assert.equal(result.primitives[1].clr.value,10);
  assert.equal(result.primitives[1].angle.value,90);
  assert.equal(result.primitives[1].plane_rotation_from_previous.value,null);
  assert.equal(result.primitives[1].clr.truth_category,"derived");
  assert.ok(result.primitives[1].clr.source.includes("part:10157546"));
  assert.ok(result.primitives[1].clr.source.includes("hsf:?Include Library/46910"));
  assert.ok(result.source_refs.includes("w3d:offset:12793080"));
});

test("A20: second bend receives neutral inter-plane rotation by source primitive index",()=>{
  const input=fixture();
  input.geometry.segmentation.primitives.push(
    {source_start_index:5,source_end_index:6,primitive:{
      type:"BEND",
      start_point:[20,30,0],
      end_point:[30,40,0],
      center:[30,30,0],
      plane_normal:[1,0,0],
      clr_mm:10,
      signed_sweep_deg:90,
      tangent_start:[0,1,0],
      tangent_end:[0,0,1],
      reason:"bend 2"
    }},
    {source_start_index:6,source_end_index:7,primitive:{
      type:"LINE",
      start:[30,40,0],
      end:[30,40,20],
      direction:[0,0,1],
      length_mm:20
    }}
  );
  input.geometry.neutral_bend_sequence.bends.push({
    bend_number:2,
    source_primitive_index:3,
    rotation_from_previous_bend_deg:90
  });

  const result=buildCanonicalTubeGeometry(input);
  assert.equal(result.primitives[3].type,"BEND");
  assert.equal(result.primitives[3].plane_rotation_from_previous.value,90);
  assert.equal(result.primitives[3].plane_rotation_from_previous.method,"neutral_bend_sequence");
});

test("A20: canonical builder refuses geometry before promotion gate",()=>{
  const input=fixture();
  input.promotion.status="blocked";
  input.promotion.canonical_ready=false;
  assert.throws(
    ()=>buildCanonicalTubeGeometry(input),
    /promotion decision must pass/
  );
});

test("A20: canonical builder rejects machine-compensated geometry",()=>{
  const input=fixture();
  input.geometry.machine_compensation_applied=true;
  assert.throws(
    ()=>buildCanonicalTubeGeometry(input),
    /cannot contain machine compensation/
  );
});

test("A20: handedness must be explicit from source/promotion evidence",()=>{
  const input=fixture();
  input.promotion.polygon_handedness=null;
  assert.throws(
    ()=>buildCanonicalTubeGeometry(input),
    /handedness must be left or right/
  );
});
