import test from "node:test";
import assert from "node:assert/strict";

import { buildLegacyTubeCandidateFromCanonical } from "../../src/import/dwfx/legacy-tube-candidate.mjs";

function cv(value){
  return {value,confidence:1,reason:null,method:"fixture",source:["fixture"],truth_category:"derived"};
}

function canonical(){
  return {
    schema_version:"1.0.0",
    tube_id:"10157546",
    length_unit:"mm",
    angle_unit:"deg",
    coordinate_frame:{id:"tube-local",handedness:"right"},
    source_refs:["part:10157546"],
    primitives:[
      {type:"LINE",element_id:"l1",start:cv([0,0,0]),end:cv([20,0,0]),length:cv(20),direction:cv([1,0,0])},
      {type:"BEND",element_id:"b1",tangent_in:cv([20,0,0]),tangent_out:cv([30,10,0]),center:cv([20,10,0]),bend_plane_normal:cv([0,0,1]),clr:cv(10),angle:cv(90),plane_rotation_from_previous:cv(null)},
      {type:"LINE",element_id:"l2",start:cv([30,10,0]),end:cv([30,40,0]),length:cv(30),direction:cv([0,1,0])}
    ]
  };
}

test("A20: promoted canonical geometry becomes editable but production-blocked legacy tube",()=>{
  const result=buildLegacyTubeCandidateFromCanonical({
    source_file:"sample.dwfx",
    part_number:"10157546",
    canonical_geometry:canonical(),
    promotion:{status:"canonical_candidate",canonical_ready:true,production_ready:false},
    metadata:{outer_diameter_mm:12.7,wall_thickness_mm:0.89}
  });

  assert.equal(result.status,"legacy_tube_candidate");
  assert.equal(result.editable_ready,true);
  assert.equal(result.production_ready,false);
  assert.equal(result.tube.startAxis,"X");
  assert.equal(result.tube.startPlane,"XY");
  assert.equal(result.tube.startAngle,0);
  assert.deepEqual(result.tube.rows.map((r)=>r.type),["LINE","BEND","LINE"]);
  assert.equal(result.tube.toolingId,null);
  assert.equal(result.tube.toolingUnresolved,true);
  assert.equal(result.tube.diameterIndex,null);
  assert.equal(result.tube.importValidation.productionBlocked,true);
  assert.equal(result.tube.importValidation.coordinateMappingResolved,true);
  assert.equal(result.tube.importValidation.toolingResolved,false);
  assert.equal(result.tube.importEvidence.legacyRowsSource,"canonical_geometry");
  assert.equal(result.tube.importEvidence.machineCompensationApplied,false);
  assert.equal(result.tube.importEvidence.canonicalGeometry.primitives[1].clr.value,10);
});

test("A20: legacy tube creation cannot bypass canonical promotion",()=>{
  assert.throws(
    ()=>buildLegacyTubeCandidateFromCanonical({
      source_file:"sample.dwfx",
      part_number:"10157546",
      canonical_geometry:canonical(),
      promotion:{status:"blocked"}
    }),
    /promotion must pass/
  );
});

test("A20: exact mapping failure returns evidence-only result instead of synthetic rows",()=>{
  const c=canonical();
  c.primitives[1].bend_plane_normal.value=[0,0,-1];
  const result=buildLegacyTubeCandidateFromCanonical({
    source_file:"sample.dwfx",
    part_number:"10157546",
    canonical_geometry:c,
    promotion:{status:"canonical_candidate"}
  });
  assert.equal(result.status,"canonical_evidence_only");
  assert.equal(result.editable_ready,false);
  assert.equal(result.tube,null);
  assert.equal(result.mapping.rows,null);
});

test("A20: candidate evidence is frozen and cannot mutate canonical source",()=>{
  const result=buildLegacyTubeCandidateFromCanonical({
    source_file:"sample.dwfx",
    part_number:"10157546",
    canonical_geometry:canonical(),
    promotion:{status:"canonical_candidate"}
  });
  assert.equal(Object.isFrozen(result.tube),true);
  assert.equal(Object.isFrozen(result.tube.importEvidence),true);
  assert.equal(Object.isFrozen(result.tube.importEvidence.canonicalGeometry),true);
  assert.equal(Object.isFrozen(result.tube.rows),true);
});
