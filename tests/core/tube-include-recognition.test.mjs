import test from "node:test";
import assert from "node:assert/strict";

import { recognizeTubeIncludeLibraryGeometry } from "../../src/recognition/tube-include-recognition.mjs";

function addSideSurface(vertices,faces,{radius,circumference,centers}){
  const start=vertices.length;
  for(const center of centers){
    for(let i=0;i<circumference;i+=1){
      const a=2*Math.PI*i/circumference;
      vertices.push([
        center[0],
        center[1]+radius*Math.cos(a),
        center[2]+radius*Math.sin(a)
      ]);
    }
  }
  for(let ring=0;ring<centers.length-1;ring+=1){
    for(let i=0;i<circumference;i+=1){
      const next=(i+1)%circumference;
      const a=start+ring*circumference+i;
      const b=start+ring*circumference+next;
      const c=start+(ring+1)*circumference+i;
      const d=start+(ring+1)*circumference+next;
      faces.push([a,b,d],[a,d,c]);
    }
  }
}

function straightTubeMesh(){
  const vertices=[],faces=[];
  const centers=[[0,0,0],[1,0,0],[2,0,0],[3,0,0]];
  addSideSurface(vertices,faces,{radius:0.5,circumference:8,centers});
  addSideSurface(vertices,faces,{radius:0.4,circumference:7,centers});
  return {
    kind:"triangle_mesh",
    source_offset:100,
    absolute_source_offset:5100,
    vertices,
    connectivity:{
      status:"decoded",
      faces
    }
  };
}

function decoderWith(meshes){
  return ()=>({
    status:"exact",
    root_segment_complete:true,
    entities:meshes
  });
}

test("A20: Include Library pipeline recognizes one metadata-valid tube mesh end to end",()=>{
  const result=recognizeTubeIncludeLibraryGeometry({
    opcodeStream:new Uint8Array(),
    includeLibraryName:"?Include Library/test",
    hsfVersion:"14.50",
    outer_diameter_mm:10,
    wall_thickness_mm:1,
    developed_length_mm:30,
    decodeSegment:decoderWith([straightTubeMesh()])
  });

  assert.equal(result.status,"geometry_candidate");
  assert.equal(result.production_ready,false);
  assert.equal(result.canonical_ready,false);
  assert.equal(result.machine_compensation_applied,false);
  assert.equal(result.mesh_candidate_count,1);
  assert.equal(result.selected_mesh_source_offset,5100);
  assert.equal(result.centerline.centerline_sample_count,4);
  assert.equal(result.segmentation.primitive_count,1);
  assert.equal(result.segmentation.primitives[0].primitive.type,"LINE");
  assert.equal(result.topology.status,"candidate_valid");
  assert.equal(result.length_consistency.status,"passed");
  assert.equal(result.neutral_bend_sequence.bend_count,0);
  assert.ok(Math.abs(result.neutral_bend_sequence.tail_length_mm-30)<1e-9);
});

test("A20: Include Library pipeline rejects multiple metadata-valid meshes as ambiguous",()=>{
  const a=straightTubeMesh();
  const b=straightTubeMesh();
  b.absolute_source_offset=5200;

  const result=recognizeTubeIncludeLibraryGeometry({
    opcodeStream:new Uint8Array(),
    includeLibraryName:"?Include Library/test",
    hsfVersion:"14.50",
    outer_diameter_mm:10,
    wall_thickness_mm:1,
    developed_length_mm:30,
    decodeSegment:decoderWith([a,b])
  });

  assert.equal(result.status,"unresolved");
  assert.equal(result.mesh_candidate_count,2);
  assert.match(result.blocker,/Multiple decoded meshes/i);
});

test("A20: Include Library pipeline rejects developed-length mismatch",()=>{
  const result=recognizeTubeIncludeLibraryGeometry({
    opcodeStream:new Uint8Array(),
    includeLibraryName:"?Include Library/test",
    hsfVersion:"14.50",
    outer_diameter_mm:10,
    wall_thickness_mm:1,
    developed_length_mm:35,
    decodeSegment:decoderWith([straightTubeMesh()])
  });

  assert.equal(result.status,"unresolved");
  assert.equal(result.length_consistency.status,"violation");
  assert.match(result.blocker,/developed-length metadata/i);
});

test("A20: incomplete HSF segment cannot fall through to mesh guessing",()=>{
  const result=recognizeTubeIncludeLibraryGeometry({
    opcodeStream:new Uint8Array(),
    includeLibraryName:"?Include Library/test",
    hsfVersion:"14.50",
    outer_diameter_mm:10,
    wall_thickness_mm:1,
    developed_length_mm:30,
    decodeSegment:()=>({
      status:"blocked",
      root_segment_complete:false,
      unsupported_variant:"fixture blocker",
      entities:[straightTubeMesh()]
    })
  });

  assert.equal(result.status,"unresolved");
  assert.equal(result.decoded_segment_status,"blocked");
  assert.match(result.blocker,/fixture blocker/);
  assert.equal(result.mesh_candidate_count,0);
});

test("A20: invalid Include Library name is rejected before decoding",()=>{
  assert.throws(
    ()=>recognizeTubeIncludeLibraryGeometry({
      opcodeStream:new Uint8Array(),
      includeLibraryName:"46910",
      outer_diameter_mm:10,
      wall_thickness_mm:1,
      developed_length_mm:30,
      decodeSegment:decoderWith([])
    }),
    /exact \?Include Library/
  );
});
