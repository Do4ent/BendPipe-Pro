import test from "node:test";
import assert from "node:assert/strict";

import { deriveTubeMeshCenterline } from "../../src/recognition/tube-mesh-centerline.mjs";

function addSideSurface(vertices,faces,{radius,circumference,centers,reversed=false}){
  const start=vertices.length;
  const ordered=reversed?[...centers].reverse():centers;
  for(const center of ordered){
    for(let i=0;i<circumference;i+=1){
      const a=2*Math.PI*i/circumference;
      vertices.push([
        center[0],
        center[1]+radius*Math.cos(a),
        center[2]+radius*Math.sin(a)
      ]);
    }
  }
  for(let ring=0;ring<ordered.length-1;ring+=1){
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

function straightHollowTube({badInnerRadius=false,reversedInner=false}={}){
  const vertices=[],faces=[];
  const centers=[[0,0,0],[1,0,0],[2,0,0],[3,0,0]];
  addSideSurface(vertices,faces,{
    radius:0.5,circumference:8,centers
  });
  addSideSurface(vertices,faces,{
    radius:badInnerRadius?0.35:0.4,
    circumference:7,
    centers,
    reversed:reversedInner
  });
  return {vertices,faces};
}

test("A20: hollow shell grids derive one shared centerline and explicit unit scale",()=>{
  const mesh=straightHollowTube();
  const result=deriveTubeMeshCenterline({
    ...mesh,
    outer_diameter_mm:10,
    wall_thickness_mm:1
  });

  assert.equal(result.status,"centerline_candidate");
  assert.equal(result.production_ready,false);
  assert.equal(result.canonical_ready,false);
  assert.ok(Math.abs(result.scale_mm_per_source_unit-10)<1e-9);
  assert.equal(result.scale_method,"derived_from_outer_diameter");
  assert.equal(result.centerline_sample_count,4);
  assert.equal(result.centerline_tangents.length,4);
  result.centerline_points_mm.forEach((point,index)=>{
    assert.ok(Math.abs(point[0]-index*10)<1e-9);
    assert.ok(Math.abs(point[1])<1e-9);
    assert.ok(Math.abs(point[2])<1e-9);
    assert.ok(Math.abs(result.centerline_tangents[index][0]-1)<1e-9);
    assert.ok(Math.abs(result.centerline_tangents[index][1])<1e-9);
    assert.ok(Math.abs(result.centerline_tangents[index][2])<1e-9);
  });
  assert.ok(result.max_surface_tangent_mismatch_deg<1e-9);
  assert.ok(result.max_ring_plane_error_mm<1e-9);
  assert.ok(Math.abs(result.observed_outer_radius_mm-5)<1e-9);
  assert.ok(Math.abs(result.observed_inner_radius_mm-4)<1e-9);
  assert.ok(Math.abs(result.chordal_polyline_length_mm-30)<1e-9);
});

test("A20: inner and outer centerline ring order may be reversed but must geometrically agree",()=>{
  const result=deriveTubeMeshCenterline({
    ...straightHollowTube({reversedInner:true}),
    outer_diameter_mm:10,
    wall_thickness_mm:1
  });
  assert.equal(result.status,"centerline_candidate");
  assert.ok(result.center_mismatch_mm<1e-9);
  result.centerline_points_mm.forEach((point,index)=>{
    assert.ok(Math.abs(point[0]-index*10)<1e-9);
    assert.ok(Math.abs(point[1])<1e-9);
    assert.ok(Math.abs(point[2])<1e-9);
    assert.ok(Math.abs(result.centerline_tangents[index][0]-1)<1e-9);
  });
  assert.ok(result.max_surface_tangent_mismatch_deg<1e-9);
});

test("A20: wall/radius mismatch remains unresolved instead of forcing a centerline",()=>{
  const result=deriveTubeMeshCenterline({
    ...straightHollowTube({badInnerRadius:true}),
    outer_diameter_mm:10,
    wall_thickness_mm:1
  });
  assert.equal(result.status,"unresolved");
  assert.equal(result.production_ready,false);
  assert.match(result.blocker,/inner radius mismatch/i);
});

test("A20: an explicit unit scale is validated rather than silently replaced",()=>{
  const result=deriveTubeMeshCenterline({
    ...straightHollowTube(),
    outer_diameter_mm:10,
    wall_thickness_mm:1,
    scale_mm_per_source_unit:1
  });
  assert.equal(result.status,"unresolved");
  assert.equal(result.diagnostics.scale_method,"explicit");
  assert.match(result.blocker,/outer radius mismatch/i);
});

test("A20: extra ring-grid surface is ignored only when metadata selects one unique inner/outer pair",()=>{
  const mesh=straightHollowTube();
  addSideSurface(mesh.vertices,mesh.faces,{
    radius:0.3,
    circumference:6,
    centers:[[0,0,0],[1,0,0],[2,0,0],[3,0,0]]
  });
  const result=deriveTubeMeshCenterline({
    ...mesh,
    outer_diameter_mm:10,
    wall_thickness_mm:1
  });
  assert.equal(result.status,"centerline_candidate");
  assert.equal(result.side_surfaces.length,2);
  assert.ok(Math.abs(result.observed_outer_radius_mm-5)<1e-9);
  assert.ok(Math.abs(result.observed_inner_radius_mm-4)<1e-9);
});

test("A20: duplicate metadata-compatible side pairs remain unresolved as ambiguous",()=>{
  const mesh=straightHollowTube();
  addSideSurface(mesh.vertices,mesh.faces,{
    radius:0.4,
    circumference:6,
    centers:[[0,0,0],[1,0,0],[2,0,0],[3,0,0]]
  });
  const result=deriveTubeMeshCenterline({
    ...mesh,
    outer_diameter_mm:10,
    wall_thickness_mm:1
  });
  assert.equal(result.status,"unresolved");
  assert.match(result.blocker,/multiple inner\/outer side-surface pairs/i);
});

test("A20: annular end-cap grids cannot masquerade as tube side surfaces",()=>{
  const mesh=straightHollowTube();
  const start=mesh.vertices.length;
  const circumference=8;
  for(const radius of [0.4,0.5]){
    for(let i=0;i<circumference;i+=1){
      const a=2*Math.PI*i/circumference;
      mesh.vertices.push([0,radius*Math.cos(a),radius*Math.sin(a)]);
    }
  }
  for(let i=0;i<circumference;i+=1){
    const next=(i+1)%circumference;
    const a=start+i;
    const b=start+next;
    const c=start+circumference+i;
    const d=start+circumference+next;
    mesh.faces.push([a,b,d],[a,d,c]);
  }

  const result=deriveTubeMeshCenterline({
    ...mesh,
    outer_diameter_mm:10,
    wall_thickness_mm:1
  });
  assert.equal(result.status,"centerline_candidate");
  assert.equal(result.side_surfaces.length,2);
  assert.ok(result.max_ring_radius_stddev_mm<0.01);
});


test("A20: ring plane mismatch can block tangent evidence independently",()=>{
  const mesh=straightHollowTube();
  // Warp one outer-ring point out of its plane while keeping topology valid.
  mesh.vertices[0]=[
    mesh.vertices[0][0]+0.02,
    mesh.vertices[0][1],
    mesh.vertices[0][2]
  ];
  const result=deriveTubeMeshCenterline({
    ...mesh,
    outer_diameter_mm:10,
    wall_thickness_mm:1,
    max_ring_plane_error_mm:0.01
  });
  assert.equal(result.status,"unresolved");
  assert.match(result.blocker,/ring plane error/i);
  assert.ok(result.diagnostics.max_ring_plane_error_mm>0.01);
});
