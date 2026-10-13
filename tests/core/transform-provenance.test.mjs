import test from "node:test";
import assert from "node:assert/strict";

import {
  analyzeRigidModellingMatrix,
  reviewIncludeTransformProvenance
} from "../../src/import/dwfx/transform-provenance.mjs";

function matrix(rows,translation=[0,0,0]){
  return [
    ...rows[0],0,
    ...rows[1],0,
    ...rows[2],0,
    ...translation,1
  ];
}
const I=matrix([[1,0,0],[0,1,0],[0,0,1]]);

test("A20: proper rigid modelling transform preserves intrinsic tube geometry",()=>{
  const m=matrix(
    [[0,-1,0],[1,0,0],[0,0,1]],
    [10,20,30]
  );
  const result=analyzeRigidModellingMatrix(m);
  assert.equal(result.status,"rigid_proper");
  assert.equal(result.rigid,true);
  assert.equal(result.proper_rotation,true);
  assert.equal(result.preserves_lengths_angles_and_orientation,true);
  assert.ok(Math.abs(result.determinant-1)<1e-12);
  assert.deepEqual(result.translation,[10,20,30]);
});

test("A20: scale or shear blocks rigid placement provenance",()=>{
  const scaled=analyzeRigidModellingMatrix(
    matrix([[2,0,0],[0,1,0],[0,0,1]])
  );
  assert.equal(scaled.status,"non_rigid");
  assert.equal(scaled.rigid,false);

  const sheared=analyzeRigidModellingMatrix(
    matrix([[1,0.1,0],[0,1,0],[0,0,1]])
  );
  assert.equal(sheared.status,"non_rigid");
  assert.equal(sheared.rigid,false);
});

test("A20: reflection is not accepted as proper rigid placement",()=>{
  const reflected=analyzeRigidModellingMatrix(
    matrix([[-1,0,0],[0,1,0],[0,0,1]])
  );
  assert.equal(reflected.rigid,false);
  assert.equal(reflected.preserves_lengths_angles_and_orientation,false);
  assert.ok(Math.abs(reflected.determinant+1)<1e-12);
});

test("A20: exact include ancestry records root placement plus nested identity",()=>{
  const root=[0,-1,0,1,0,0,0,0,1];
  const rootMatrix=matrix(
    [root.slice(0,3),root.slice(3,6),root.slice(6,9)],
    [4,5,6]
  );
  const decoded={
    entities:[
      {
        kind:"transform",
        source_offset:10,
        absolute_source_offset:1010,
        segment_path:["121191"],
        matrix:rootMatrix
      },
      {
        kind:"segment",
        action:"open",
        source_offset:60,
        segment_path:["121191",""],
        name:""
      },
      {
        kind:"transform",
        source_offset:62,
        absolute_source_offset:1062,
        segment_path:["121191",""],
        matrix:I
      },
      {
        kind:"segment",
        action:"include",
        source_offset:111,
        absolute_source_offset:1111,
        segment_path:["121191",""],
        name:"?Include Library/46910"
      }
    ]
  };

  const result=reviewIncludeTransformProvenance(
    decoded,
    "?Include Library/46910"
  );
  assert.equal(result.status,"rigid_placement");
  assert.equal(result.canonical_ready,true);
  assert.equal(result.transform_count,2);
  assert.equal(result.transforms[0].source_offset,1010);
  assert.equal(result.transforms[1].source_offset,1062);
  assert.equal(result.all_placement_transforms_proper_rigid,true);
  assert.equal(result.intrinsic_geometry_invariants_preserved,true);
});

test("A20: non-rigid ancestor blocks Include Library provenance",()=>{
  const decoded={
    entities:[
      {
        kind:"transform",
        source_offset:10,
        segment_path:["7"],
        matrix:matrix([[2,0,0],[0,1,0],[0,0,1]])
      },
      {
        kind:"segment",
        action:"include",
        source_offset:20,
        segment_path:["7"],
        name:"?Include Library/1"
      }
    ]
  };
  const result=reviewIncludeTransformProvenance(
    decoded,
    "?Include Library/1"
  );
  assert.equal(result.status,"blocked");
  assert.equal(result.canonical_ready,false);
  assert.equal(result.all_placement_transforms_proper_rigid,false);
});

test("A20: duplicate exact includes remain ambiguous",()=>{
  const decoded={
    entities:[
      {kind:"segment",action:"include",source_offset:10,segment_path:["7"],name:"?Include Library/1"},
      {kind:"segment",action:"include",source_offset:20,segment_path:["7"],name:"?Include Library/1"}
    ]
  };
  const result=reviewIncludeTransformProvenance(decoded,"?Include Library/1");
  assert.equal(result.status,"ambiguous");
  assert.equal(result.include_match_count,2);
  assert.equal(result.canonical_ready,false);
});
