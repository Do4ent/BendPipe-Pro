import test from "node:test";
import assert from "node:assert/strict";

import { canonicalToLegacyRows } from "../../src/recognition/canonical-to-legacy-rows.mjs";
import { replayLegacyDirection, angleBetweenVectorsDeg } from "../../src/recognition/legacy-row-kinematics.mjs";

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

function canonicalXYZ(){
  return {
    schema_version:"1.0.0",
    tube_id:"tube-xyz",
    length_unit:"mm",
    angle_unit:"deg",
    coordinate_frame:{id:"tube-local",handedness:"right"},
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

test("A20: canonical X-Y-Z sequence becomes exact editable VC207R7 rows",()=>{
  const result=canonicalToLegacyRows(canonicalXYZ());

  assert.equal(result.status,"legacy_rows_candidate");
  assert.equal(result.editable_ready,true);
  assert.equal(result.production_ready,false);
  assert.equal(result.startAxis,"X");
  assert.equal(result.startPlane,"XY");
  assert.equal(result.startAngle,0);
  assert.deepEqual(result.origin,{x:0,y:0,z:0});
  assert.equal(result.rows.length,5);
  assert.deepEqual(result.rows.map((r)=>r.type),["LINE","BEND","LINE","BEND","LINE"]);

  assert.equal(result.rows[0].L,20);
  assert.equal(result.rows[1].angle,90);
  assert.equal(result.rows[1].plane,"XY");
  assert.ok(Math.abs(result.rows[1].rot)<1e-9);
  assert.equal(result.rows[1].clr,10);
  assert.equal(result.rows[1].clrSource,"recognized_canonical_geometry");
  assert.equal(result.rows[1].clrToolingId,null);

  assert.equal(result.rows[3].angle,90);
  assert.equal(result.rows[3].clr,10);
  assert.equal(result.toolingUnresolved,true);
  assert.equal(result.toolingId,null);
  assert.equal(result.import_validation.coordinateMappingResolved,true);
  assert.equal(result.import_validation.toolingResolved,false);
});

test("A20: generated legacy rows replay the canonical line directions",()=>{
  const result=canonicalToLegacyRows(canonicalXYZ());
  let direction=[1,0,0];
  const expected=[[1,0,0],[0,1,0],[0,0,1]];
  let lineIndex=0;
  for(const row of result.rows){
    if(row.type==="LINE"){
      assert.ok(angleBetweenVectorsDeg(direction,expected[lineIndex])<1e-5);
      lineIndex+=1;
    }else{
      direction=replayLegacyDirection(direction,{
        angle:row.angle,plane:row.plane,rotation:row.rot
      });
    }
  }
});

test("A20: negative canonical bend sign is preserved in legacy row",()=>{
  const c=canonicalXYZ();
  c.primitives=[
    line("l1",[0,0,0],[20,0,0],[1,0,0],20),
    bend("b1",[20,0,0],[30,10,0],[20,10,0],[0,0,-1],10,-90),
    line("l2",[30,10,0],[30,40,0],[0,1,0],30)
  ];
  const result=canonicalToLegacyRows(c);
  assert.equal(result.status,"legacy_rows_candidate");
  assert.equal(result.rows[1].angle,-90);
  const out=replayLegacyDirection([1,0,0],{
    angle:result.rows[1].angle,
    plane:result.rows[1].plane,
    rotation:result.rows[1].rot
  });
  assert.ok(angleBetweenVectorsDeg(out,[0,1,0])<1e-5);
});

test("A20: canonical bend normal mismatch blocks editable rows",()=>{
  const c=canonicalXYZ();
  c.primitives[1].bend_plane_normal.value=[0,0,-1];
  const result=canonicalToLegacyRows(c);
  assert.equal(result.status,"blocked");
  assert.equal(result.editable_ready,false);
  assert.equal(result.rows,null);
  assert.match(result.blocker,/cannot be encoded exactly/i);
});

test("A20: canonical CLR and element IDs survive row mapping without tooling substitution",()=>{
  const result=canonicalToLegacyRows(canonicalXYZ());
  assert.equal(result.rows[1].elementId,"b1");
  assert.equal(result.rows[1].canonicalElementId,"b1");
  assert.equal(result.rows[1].clr,10);
  assert.equal(result.rows[1].geometrySource,"canonical_dwfx");
  assert.equal(result.rows[3].elementId,"b2");
  assert.equal(result.rows[3].clrToolingId,null);
});

test("A20: non-alternating canonical topology cannot be coerced into legacy rows",()=>{
  const c=canonicalXYZ();
  c.primitives.splice(1,1);
  const result=canonicalToLegacyRows(c);
  assert.equal(result.status,"blocked");
  assert.match(result.blocker,/alternating LINE\/BEND/i);
});
