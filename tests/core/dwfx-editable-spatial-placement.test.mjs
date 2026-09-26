import test from "node:test";
import assert from "node:assert/strict";

import {
  spatiallyPlaceEditableTube,
  spatiallyPlaceDwfxAssembly
} from "../../src/import/dwfx/editable-spatial-placement.mjs";
import {
  replayLegacyDirection,
  angleBetweenVectorsDeg
} from "../../src/recognition/legacy-row-kinematics.mjs";

function cv(value){
  return {value,confidence:1,reason:null,method:"fixture",source:["fixture"],truth_category:"derived"};
}
function line(id,start,end,direction,length){
  return {
    type:"LINE",element_id:id,
    start:cv(start),end:cv(end),length:cv(length),direction:cv(direction)
  };
}
function bend(id,start,end,center,normal,clr,angle){
  return {
    type:"BEND",element_id:id,
    tangent_in:cv(start),tangent_out:cv(end),center:cv(center),
    bend_plane_normal:cv(normal),clr:cv(clr),angle:cv(angle),
    plane_rotation_from_previous:cv(null)
  };
}
function canonical(){
  return {
    schema_version:"1.0.0",
    tube_id:"T",
    length_unit:"mm",
    angle_unit:"deg",
    coordinate_frame:{id:"w3d-local",handedness:"left"},
    source_refs:["fixture"],
    primitives:[
      line("l1",[0,0,0],[20,0,0],[1,0,0],20),
      bend("b1",[20,0,0],[30,10,0],[20,10,0],[0,0,1],10,90),
      line("l2",[30,10,0],[30,40,0],[0,1,0],30),
      bend("b2",[30,40,0],[30,50,10],[30,40,10],[1,0,0],10,90),
      line("l3",[30,50,10],[30,50,50],[0,0,1],40)
    ]
  };
}
function tube(c=canonical()){
  return {
    id:"dwfx:A",
    name:"A",
    partNumber:"A",
    rows:[],
    origin:{x:0,y:0,z:0},
    startAxis:"X",
    startPlane:"XY",
    startAngle:0,
    importEvidence:{
      source:{format:"DWFx",file:"sample.dwfx",part_number:"A"},
      canonicalGeometry:c
    },
    importValidation:{productionBlocked:true}
  };
}
function node(matrix,part="A"){
  return {
    id:"obj-A",
    label:"Tube A",
    editable_part_number:part,
    geometry_instances:[{
      asset_id:"?Include Library/1",
      placement_matrix:matrix,
      status:"exact"
    }],
    children:[]
  };
}

test("A33: straight editable tube preserves exact source translation and first direction",()=>{
  const straight={
    ...canonical(),
    primitives:[line("l1",[0,0,0],[0,0,37],[0,0,1],37)]
  };
  const matrix=[
    1,0,0,0,
    0,0,1,0,
    0,-1,0,0,
    8,20,30,1
  ];
  const result=spatiallyPlaceEditableTube({
    tube:tube(straight),
    reference_node:node(matrix),
    scale_mm_per_source_unit:10
  });

  assert.equal(result.status,"placed");
  assert.deepEqual(
    result.tube.origin,
    {x:80,y:200,z:300}
  );
  assert.ok(angleBetweenVectorsDeg(
    [result.tube.startVector.x,result.tube.startVector.y,result.tube.startVector.z],
    [0,-1,0]
  )<1e-8);
  assert.equal(result.tube.rows.length,1);
  assert.equal(result.tube.rows[0].L,37);
  assert.equal(result.tube.importValidation.spatialPlacementResolved,true);
  assert.equal(result.tube.importEvidence.spatialPlacement.status,"exact");
});

test("A33: bent editable rows replay exact placed world directions",()=>{
  // Proper rigid Z rotation: source X -> world Y, source Y -> world -X.
  const matrix=[
    0,1,0,0,
    -1,0,0,0,
    0,0,1,0,
    12,34,56,1
  ];
  const result=spatiallyPlaceEditableTube({
    tube:tube(),
    reference_node:node(matrix),
    scale_mm_per_source_unit:10
  });

  assert.equal(result.status,"placed");
  assert.deepEqual(result.tube.origin,{x:120,y:340,z:560});
  assert.ok(angleBetweenVectorsDeg(
    [result.tube.startVector.x,result.tube.startVector.y,result.tube.startVector.z],
    [0,1,0]
  )<1e-8);
  assert.deepEqual(result.tube.rows.map((r)=>r.type),["LINE","BEND","LINE","BEND","LINE"]);

  let dir=[
    result.tube.startVector.x,
    result.tube.startVector.y,
    result.tube.startVector.z
  ];
  const expected=[[0,1,0],[-1,0,0],[0,0,1]];
  let lineIndex=0;
  for(const row of result.tube.rows){
    if(row.type==="LINE"){
      assert.ok(angleBetweenVectorsDeg(dir,expected[lineIndex])<1e-5);
      lineIndex+=1;
    }else{
      dir=[...replayLegacyDirection(dir,{
        angle:row.angle,
        plane:row.plane,
        rotation:row.rot
      })];
    }
  }
  assert.equal(result.tube.rows[1].clr,10);
  assert.equal(result.tube.rows[3].clr,10);
});

test("A33: assembly placement is fail-closed on ambiguous editable source instance",()=>{
  const assembly={
    status:"assembly_candidate",
    editable_ready:true,
    production_ready:false,
    tubes:[tube()]
  };
  const reference_scene={
    scale_mm_per_source_unit:10,
    tree:[{
      ...node([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),
      geometry_instances:[
        {placement_matrix:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]},
        {placement_matrix:[1,0,0,0,0,1,0,0,0,0,1,0,1,0,0,1]}
      ]
    }]
  };
  const result=spatiallyPlaceDwfxAssembly({assembly,reference_scene});
  assert.equal(result.status,"blocked");
  assert.match(result.blocker,/could not preserve exact source spatial placement/i);
});

test("A33: assembly placement returns editable tubes with exact pose",()=>{
  const matrix=[
    1,0,0,0,
    0,1,0,0,
    0,0,1,0,
    3,4,5,1
  ];
  const assembly={
    status:"assembly_candidate",
    editable_ready:true,
    production_ready:false,
    tubes:[tube()]
  };
  const result=spatiallyPlaceDwfxAssembly({
    assembly,
    reference_scene:{
      scale_mm_per_source_unit:10,
      tree:[node(matrix)]
    }
  });
  assert.equal(result.status,"placed_assembly");
  assert.equal(result.placed_count,1);
  assert.equal(result.assembly.spatial_placement_status,"exact_reference_scene");
  assert.deepEqual(result.assembly.tubes[0].origin,{x:30,y:40,z:50});
});
