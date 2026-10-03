import test from "node:test";
import assert from "node:assert/strict";

import { prepareDwfxAssemblyImport } from "../../src/import/dwfx/assembly-import-pipeline.mjs";

const PARTS=[
  ["10160780","?Include Library/34001",9.53,0.76,776.3],
  ["10157546","?Include Library/46910",12.7,0.89,1214.6],
  ["10157555","?Include Library/47012",12.7,0.89,773.6],
  ["10157683","?Include Library/47033",19.05,1.7,1701.0],
  ["10157549","?Include Library/69646",9.53,0.76,512.3],
  ["10157552","?Include Library/69667",9.53,0.76,1248.0]
];

function parts(){
  return PARTS.map(([part_number,include_library,outer_diameter_mm,wall_thickness_mm,developed_length_mm])=>({
    part_number,
    include_library,
    outer_diameter_mm,
    wall_thickness_mm,
    developed_length_mm,
    decoded_variation_segment:{status:"exact",root_segment_complete:true,entities:[]},
    metadata:{outer_diameter_mm,wall_thickness_mm,developed_length_mm}
  }));
}

function preparedTube(args){
  const canonical={
    schema_version:"1.0.0",
    tube_id:args.part_number,
    source_refs:["part:"+args.part_number,"hsf:"+args.include_library]
  };
  return {
    status:"legacy_tube_candidate",
    stage:"complete",
    tube:{
      id:"dwfx:"+args.part_number,
      partNumber:args.part_number,
      toolingId:null,
      toolingUnresolved:true,
      rows:[
        {type:"LINE",L:10,geometrySource:"canonical_dwfx"},
        {type:"BEND",angle:90,plane:"XY",rot:0,clr:15,clrSource:"recognized_canonical_geometry"},
        {type:"LINE",L:10,geometrySource:"canonical_dwfx"}
      ],
      importEvidence:{
        canonicalGeometry:canonical,
        machineCompensationApplied:false,
        legacyRowsSource:"canonical_geometry"
      },
      importValidation:{
        productionBlocked:true,
        coordinateMappingResolved:true,
        canonicalGeometryPreserved:true,
        legacyAxisPlaneDefaultsApplied:false,
        toolingResolved:false,
        productionSettingsConfirmed:false
      }
    }
  };
}

test("A20: six-part assembly keeps every canonical-backed editable tube production-blocked",()=>{
  const result=prepareDwfxAssemblyImport({
    opcode_stream:new Uint8Array(),
    descriptor:{status:"exact"},
    source_file:"80003043(A).dwfx",
    hsf_version:"14.50",
    parts:parts(),
    prepareTube:preparedTube
  });

  assert.equal(result.status,"assembly_candidate");
  assert.equal(result.editable_ready,true);
  assert.equal(result.production_ready,false);
  assert.equal(result.part_count,6);
  assert.equal(result.editable_count,6);
  assert.equal(result.blocked_count,0);
  assert.deepEqual(result.tubes.map((t)=>t.partNumber),PARTS.map((x)=>x[0]));

  for(const tube of result.tubes){
    assert.equal(tube.toolingUnresolved,true,tube.partNumber);
    assert.equal(tube.toolingId,null,tube.partNumber);
    assert.equal(tube.importValidation.productionBlocked,true,tube.partNumber);
    assert.equal(tube.importValidation.coordinateMappingResolved,true,tube.partNumber);
    assert.equal(tube.importValidation.canonicalGeometryPreserved,true,tube.partNumber);
    assert.equal(tube.importValidation.legacyAxisPlaneDefaultsApplied,false,tube.partNumber);
    assert.equal(tube.importValidation.toolingResolved,false,tube.partNumber);
    assert.equal(tube.importValidation.productionSettingsConfirmed,false,tube.partNumber);
    assert.equal(tube.importEvidence.machineCompensationApplied,false,tube.partNumber);
    assert.equal(tube.importEvidence.legacyRowsSource,"canonical_geometry",tube.partNumber);
    assert.ok(tube.rows.every((row)=>row.type==="BEND" ? row.clrSource==="recognized_canonical_geometry" : row.geometrySource==="canonical_dwfx"));
  }
});

test("A20: one blocked real part keeps the other five candidates and explicit failure",()=>{
  const result=prepareDwfxAssemblyImport({
    opcode_stream:new Uint8Array(),
    descriptor:{status:"exact"},
    source_file:"80003043(A).dwfx",
    hsf_version:"14.50",
    parts:parts(),
    prepareTube:(args)=>args.part_number==="10157683"
      ? {status:"blocked",stage:"legacy_mapping",blocker:"coordinate mapping failed"}
      : preparedTube(args)
  });

  assert.equal(result.status,"partial");
  assert.equal(result.editable_ready,false);
  assert.equal(result.editable_count,5);
  assert.equal(result.blocked_count,1);
  assert.equal(result.tubes.some((t)=>t.partNumber==="10157683"),false);
  assert.deepEqual(result.blocked_parts,[{
    part_number:"10157683",
    stage:"legacy_mapping",
    blocker:"coordinate mapping failed"
  }]);
});
