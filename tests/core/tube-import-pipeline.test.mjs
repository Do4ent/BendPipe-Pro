import test from "node:test";
import assert from "node:assert/strict";

import { prepareDwfxTubeImport } from "../../src/import/dwfx/tube-import-pipeline.mjs";

function descriptor(){
  return {
    status:"exact",
    w3d:{scale_mm_per_source_unit:10,polygon_handedness:"left"}
  };
}

function geometryCandidate(scale=10){
  return {
    status:"geometry_candidate",
    include_library:"?Include Library/46910",
    source_scale_status:"explicit_source",
    source_scale_mm_per_source_unit:scale,
    selected_mesh_source_offset:1234,
    machine_compensation_applied:false,
    topology:{status:"candidate_valid"},
    length_consistency:{
      status:"passed",
      reconstructed_developed_length_mm:65.70796326794897
    },
    neutral_bend_sequence:{
      status:"candidate",
      bend_count:1,
      bends:[{
        bend_number:1,
        source_primitive_index:1,
        rotation_from_previous_bend_deg:null
      }]
    },
    segmentation:{
      primitive_count:3,
      primitives:[
        {source_start_index:0,source_end_index:1,primitive:{
          type:"LINE",start:[0,0,0],end:[20,0,0],direction:[1,0,0],length_mm:20
        }},
        {source_start_index:1,source_end_index:2,primitive:{
          type:"BEND",start_point:[20,0,0],end_point:[30,10,0],center:[20,10,0],
          plane_normal:[0,0,1],tangent_start:[1,0,0],tangent_end:[0,1,0],
          clr_mm:10,signed_sweep_deg:90,evidence_mode:"two_point_ring_tangents"
        }},
        {source_start_index:2,source_end_index:3,primitive:{
          type:"LINE",start:[30,10,0],end:[30,40,0],direction:[0,1,0],length_mm:30
        }}
      ]
    }
  };
}

function rigid(){
  return {
    status:"rigid_placement",
    intrinsic_geometry_invariants_preserved:true,
    transform_count:2,
    reason:"fixture rigid"
  };
}

function baseArgs(){
  return {
    opcode_stream:new Uint8Array(),
    decoded_variation_segment:{entities:[]},
    include_library:"?Include Library/46910",
    descriptor:descriptor(),
    source_file:"sample.dwfx",
    part_number:"10157546",
    hsf_version:"14.50",
    outer_diameter_mm:12.7,
    wall_thickness_mm:0.89,
    developed_length_mm:65.70796326794897
  };
}

test("A20: single-tube facade reaches editable legacy candidate through every gate",()=>{
  let recognitionArgs=null;
  const result=prepareDwfxTubeImport({
    ...baseArgs(),
    recognizeGeometry:(args)=>{recognitionArgs=args;return geometryCandidate();},
    reviewTransforms:()=>rigid()
  });

  assert.equal(result.status,"legacy_tube_candidate");
  assert.equal(result.stage,"complete");
  assert.equal(result.editable_ready,true);
  assert.equal(result.production_ready,false);
  assert.equal(recognitionArgs.scale_mm_per_source_unit,10);
  assert.equal(recognitionArgs.outer_diameter_mm,12.7);
  assert.equal(recognitionArgs.wall_thickness_mm,0.89);
  assert.equal(result.canonicalization.status,"canonical_candidate");
  assert.equal(result.legacy.status,"legacy_tube_candidate");
  assert.deepEqual(result.tube.rows.map((r)=>r.type),["LINE","BEND","LINE"]);
  assert.equal(result.tube.toolingUnresolved,true);
});

test("A20: facade stops at descriptor before geometry recognition",()=>{
  let called=false;
  const args=baseArgs();
  args.descriptor={status:"unresolved",w3d:{scale_mm_per_source_unit:null}};
  const result=prepareDwfxTubeImport({
    ...args,
    recognizeGeometry:()=>{called=true;return geometryCandidate();}
  });
  assert.equal(result.status,"blocked");
  assert.equal(result.stage,"descriptor");
  assert.equal(called,false);
});

test("A20: geometry blocker cannot fall through to transform or canonicalization",()=>{
  let transformsCalled=false;
  const result=prepareDwfxTubeImport({
    ...baseArgs(),
    recognizeGeometry:()=>({status:"unresolved",blocker:"mesh ambiguous"}),
    reviewTransforms:()=>{transformsCalled=true;return rigid();}
  });
  assert.equal(result.status,"blocked");
  assert.equal(result.stage,"geometry");
  assert.match(result.blocker,/mesh ambiguous/);
  assert.equal(transformsCalled,false);
});

test("A20: non-rigid placement stops before canonical geometry creation",()=>{
  const result=prepareDwfxTubeImport({
    ...baseArgs(),
    recognizeGeometry:()=>geometryCandidate(),
    reviewTransforms:()=>({
      status:"blocked",
      intrinsic_geometry_invariants_preserved:false,
      reason:"scale in placement"
    })
  });
  assert.equal(result.status,"blocked");
  assert.equal(result.stage,"transform_provenance");
  assert.equal(result.canonicalization,null);
  assert.match(result.blocker,/scale in placement/);
});

test("A20: descriptor/geometry scale mismatch stops at canonicalization gate",()=>{
  const result=prepareDwfxTubeImport({
    ...baseArgs(),
    recognizeGeometry:()=>geometryCandidate(9.5),
    reviewTransforms:()=>rigid()
  });
  assert.equal(result.status,"blocked");
  assert.equal(result.stage,"canonicalization");
  assert.equal(result.legacy,null);
  assert.ok(result.canonicalization.promotion.blockers.some((x)=>/scale/i.test(x)));
});
