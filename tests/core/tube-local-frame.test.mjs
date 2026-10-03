import test from "node:test";
import assert from "node:assert/strict";

import {
  deriveTubeLocalFrame,
  rebaseCanonicalToTubeLocal,
  transformPointToTubeLocal,
  transformVectorToTubeLocal
} from "../../src/recognition/tube-local-frame.mjs";

function cv(value){
  return {value,confidence:1,reason:null,method:"fixture",source:["fixture"],truth_category:"derived"};
}

function canonical(){
  return {
    schema_version:"1.0.0",
    tube_id:"t1",
    length_unit:"mm",
    angle_unit:"deg",
    coordinate_frame:{id:"w3d-local",handedness:"left"},
    source_refs:["fixture"],
    primitives:[
      {
        type:"LINE",
        element_id:"l1",
        start:cv([10,20,30]),
        end:cv([10,30,30]),
        length:cv(10),
        direction:cv([0,1,0])
      },
      {
        type:"BEND",
        element_id:"b1",
        tangent_in:cv([10,30,30]),
        tangent_out:cv([20,40,30]),
        center:cv([20,30,30]),
        bend_plane_normal:cv([0,0,1]),
        clr:cv(10),
        angle:cv(90),
        plane_rotation_from_previous:cv(null)
      },
      {
        type:"LINE",
        element_id:"l2",
        start:cv([20,40,30]),
        end:cv([30,40,30]),
        length:cv(10),
        direction:cv([1,0,0])
      }
    ]
  };
}

function near(a,b,tol=1e-12){
  assert.equal(a.length,b.length);
  for(let i=0;i<a.length;i++){
    assert.ok(Math.abs(a[i]-b[i])<=tol,String(a)+" vs "+String(b));
  }
}

test("A20: tube-local frame is a proper rigid basis derived from first line and bend",()=>{
  const frame=deriveTubeLocalFrame(canonical());

  assert.equal(frame.status,"exact");
  assert.equal(frame.canonical_ready,true);
  assert.equal(frame.production_ready,false);
  assert.equal(frame.legacy_start_axis,"X");
  assert.equal(frame.legacy_first_bend_plane,"XY");
  assert.equal(frame.handedness,"right");
  assert.equal(frame.rigid_rebase,true);
  assert.equal(frame.reflection_applied,false);
  assert.equal(frame.scale_applied,false);
  assert.ok(Math.abs(frame.determinant-1)<1e-12);

  near(frame.axes.x,[0,1,0]);
  near(frame.axes.z,[0,0,1]);
});

test("A20: first canonical line maps exactly onto local +X from origin",()=>{
  const c=canonical();
  const frame=deriveTubeLocalFrame(c);

  near(transformPointToTubeLocal(c.primitives[0].start.value,frame),[0,0,0]);
  near(transformPointToTubeLocal(c.primitives[0].end.value,frame),[10,0,0]);
  near(transformVectorToTubeLocal(c.primitives[0].direction.value,frame),[1,0,0]);
});

test("A20: first bend plane maps to local +Z so its plane is XY",()=>{
  const c=canonical();
  const frame=deriveTubeLocalFrame(c);
  near(
    transformVectorToTubeLocal(c.primitives[1].bend_plane_normal.value,frame),
    [0,0,1]
  );
});

test("A20: rigid rebase preserves nominal scalar geometry and provenance",()=>{
  const c=canonical();
  const result=rebaseCanonicalToTubeLocal(c);

  assert.equal(result.status,"rebased");
  assert.equal(result.production_ready,false);
  assert.equal(result.canonical_geometry.coordinate_frame.id,"tube-local");
  assert.equal(result.canonical_geometry.coordinate_frame.handedness,"right");

  assert.equal(result.canonical_geometry.primitives[0].length.value,10);
  assert.equal(result.canonical_geometry.primitives[1].clr.value,10);
  assert.equal(result.canonical_geometry.primitives[1].angle.value,90);
  assert.deepEqual(
    result.canonical_geometry.primitives[1].clr.source,
    c.primitives[1].clr.source
  );
  assert.equal(
    result.canonical_geometry.primitives[1].clr.truth_category,
    "derived"
  );
});

test("A20: non-orthogonal first line and bend plane block coordinate mapping",()=>{
  const c=canonical();
  c.primitives[1].bend_plane_normal.value=[0,1,1];
  const frame=deriveTubeLocalFrame(c,{orthogonality_tolerance:1e-9});

  assert.equal(frame.status,"blocked");
  assert.equal(frame.canonical_ready,false);
  assert.match(frame.reason,/not orthogonal/i);
});

test("A20: straight-only tube keeps bend plane unresolved instead of guessing XY",()=>{
  const c=canonical();
  c.primitives=c.primitives.filter((p)=>p.type==="LINE");
  const frame=deriveTubeLocalFrame(c);

  assert.equal(frame.status,"unresolved");
  assert.equal(frame.canonical_ready,false);
  assert.match(frame.reason,/does not define a unique bend plane/i);
});
