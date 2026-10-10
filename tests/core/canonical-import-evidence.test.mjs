import test from "node:test";
import assert from "node:assert/strict";

import { createCanonicalImportEvidence } from "../../src/import/dwfx/canonical-import-evidence.mjs";

function canonical(){
  return {
    schema_version:"1.0.0",
    tube_id:"10157546",
    length_unit:"mm",
    angle_unit:"deg",
    coordinate_frame:{id:"w3d-local",handedness:"left"},
    source_refs:["part:10157546","hsf:?Include Library/46910"],
    primitives:[
      {
        type:"LINE",
        element_id:"10157546:line:1",
        start:{value:[0,0,0],confidence:1,reason:null,method:"fixture",source:["part:10157546"],truth_category:"derived"},
        end:{value:[10,0,0],confidence:1,reason:null,method:"fixture",source:["part:10157546"],truth_category:"derived"},
        length:{value:10,confidence:1,reason:null,method:"fixture",source:["part:10157546"],truth_category:"derived"},
        direction:{value:[1,0,0],confidence:1,reason:null,method:"fixture",source:["part:10157546"],truth_category:"derived"}
      }
    ]
  };
}

test("A20: canonical DWFx geometry is preserved before legacy row mapping",()=>{
  const result=createCanonicalImportEvidence({
    source_file:"sample.dwfx",
    part_number:"10157546",
    canonical_geometry:canonical(),
    promotion:{status:"canonical_candidate",canonical_ready:true,production_ready:false}
  });

  assert.equal(result.geometry_status,"canonical_evidence");
  assert.equal(result.canonical_ready,true);
  assert.equal(result.production_ready,false);
  assert.equal(result.production_blocked,true);
  assert.equal(result.coordinate_mapping_status,"unresolved");
  assert.equal(result.editable_rows,null);
  assert.equal(result.import_validation.productionBlocked,true);
  assert.equal(result.import_validation.coordinateMappingResolved,false);
  assert.equal(result.import_validation.canonicalGeometryPreserved,true);
  assert.equal(result.import_validation.legacyAxisPlaneDefaultsApplied,false);
  assert.equal(result.canonical_geometry.primitives[0].type,"LINE");
});

test("A20: unresolved coordinate mapping cannot silently synthesize editable rows",()=>{
  const result=createCanonicalImportEvidence({
    source_file:"sample.dwfx",
    part_number:"10157546",
    canonical_geometry:canonical(),
    promotion:{status:"canonical_candidate"}
  });

  assert.equal(result.editable_rows,null);
  assert.match(result.editable_rows_reason,/must not be guessed/i);
  assert.doesNotMatch(result.editable_rows_reason,/default X|default plane/i);
});

test("A20: canonical import evidence requires passed promotion",()=>{
  assert.throws(
    ()=>createCanonicalImportEvidence({
      source_file:"sample.dwfx",
      part_number:"10157546",
      canonical_geometry:canonical(),
      promotion:{status:"blocked"}
    }),
    /promotion must pass/
  );
});

test("A20: canonical import evidence is deeply frozen against accidental mutation",()=>{
  const result=createCanonicalImportEvidence({
    source_file:"sample.dwfx",
    part_number:"10157546",
    canonical_geometry:canonical(),
    promotion:{status:"canonical_candidate"}
  });

  assert.equal(Object.isFrozen(result),true);
  assert.equal(Object.isFrozen(result.canonical_geometry),true);
  assert.equal(Object.isFrozen(result.canonical_geometry.primitives),true);
  assert.equal(Object.isFrozen(result.canonical_geometry.primitives[0]),true);
  assert.equal(Object.isFrozen(result.canonical_geometry.primitives[0].start.value),true);
});
