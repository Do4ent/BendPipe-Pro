import test from "node:test";
import assert from "node:assert/strict";

import {
  nearestTableDiameter,
  normalizeImportedTubeDiameterToCatalog,
  normalizeImportedProjectDiameters
} from "../../src/import/dwfx/table-diameter-normalization.mjs";

const catalog=[
  {id:"d635",mm:6.35,Rb:15},
  {id:"d953",mm:9.53,Rb:25},
  {id:"d127",mm:12.7,Rb:40},
  {id:"d150",mm:15,Rb:60},
  {id:"d1588",mm:15.88,Rb:60},
  {id:"d1905",mm:19.05,Rb:60},
  {id:"d220",mm:22,Rb:65}
];

function importedTube(derivedOd,{metadataOd=19.05}={}){
  return {
    id:"dwfx:1",
    partNumber:"1",
    rows:[
      {type:"LINE",L:100},
      {type:"BEND",angle:90,clr:50,plane:"XY",rot:0},
      {type:"LINE",L:120}
    ],
    toolingId:"must-be-cleared",
    toolingUnresolved:false,
    diameterIndex:null,
    importEvidence:{
      source:{format:"DWFx",file:"sample.dwfx"},
      metadata:{outer_diameter_mm:metadataOd},
      recognitionSummary:{
        dimension_source:"geometry_derived",
        dimension_reconciliation:{
          derived_outer_diameter_mm:derivedOd
        }
      },
      machineCompensationApplied:false
    },
    importValidation:{
      productionBlocked:true,
      toolingResolved:false,
      issues:[]
    }
  };
}

test("A31: nearest active table diameter is deterministic",()=>{
  const nearSmall=nearestTableDiameter(9.700000225,catalog);
  assert.equal(nearSmall.table_outer_diameter_mm,9.53);
  assert.equal(nearSmall.table_index,1);

  const near15=nearestTableDiameter(14.834999261,catalog);
  assert.equal(near15.table_outer_diameter_mm,15);
  assert.equal(near15.table_index,3);

  const exact=nearestTableDiameter(19.05,catalog);
  assert.equal(exact.table_outer_diameter_mm,19.05);
  assert.equal(exact.error_mm,0);
});

test("A31: imported W3D OD is rounded to table for display while tooling stays unresolved",()=>{
  const source=importedTube(9.700000225,{metadataOd:9.525});
  const beforeClr=source.rows[1].clr;

  const {tube,normalization}=normalizeImportedTubeDiameterToCatalog(
    source,
    catalog
  );

  assert.equal(normalization.status,"snapped");
  assert.equal(normalization.source_kind,"recognized_w3d_geometry");
  assert.equal(normalization.source_outer_diameter_mm,9.700000225);
  assert.equal(normalization.table_outer_diameter_mm,9.53);
  assert.equal(tube.diameterIndex,1);
  assert.equal(tube.toolingId,null);
  assert.equal(tube.toolingUnresolved,true);
  assert.equal(tube.rows[1].clr,beforeClr);
  assert.equal(tube.importValidation.productionBlocked,true);
  assert.equal(tube.importValidation.toolingResolved,false);
  assert.equal(tube.importEvidence.diameterNormalization.tooling_selected,false);
  assert.equal(tube.importEvidence.diameterNormalization.affects_display_only,true);
});

test("A31: geometry-derived OD wins over conflicting metadata OD",()=>{
  const {tube}=normalizeImportedTubeDiameterToCatalog(
    importedTube(14.834999261,{metadataOd:15.875}),
    catalog
  );

  assert.equal(tube.diameterIndex,3);
  assert.equal(tube.importEvidence.diameterNormalization.source_outer_diameter_mm,14.834999261);
  assert.equal(tube.importEvidence.diameterNormalization.table_outer_diameter_mm,15);
  assert.equal(tube.importEvidence.diameterNormalization.source_kind,"recognized_w3d_geometry");
});

test("A31: metadata OD is used only when recognized geometry OD is unavailable",()=>{
  const t=importedTube(undefined,{metadataOd:15.875});
  delete t.importEvidence.recognitionSummary.dimension_reconciliation;

  const {tube}=normalizeImportedTubeDiameterToCatalog(t,catalog);
  assert.equal(tube.diameterIndex,4);
  assert.equal(tube.importEvidence.diameterNormalization.table_outer_diameter_mm,15.88);
  assert.equal(tube.importEvidence.diameterNormalization.source_kind,"exact_dwfx_metadata");
});

test("A31: large deviation is still rounded as requested but remains an explicit production warning",()=>{
  const {tube,normalization}=normalizeImportedTubeDiameterToCatalog(
    importedTube(25,{metadataOd:25}),
    catalog,
    {recommended_tolerance_mm:0.35}
  );

  assert.equal(normalization.status,"snapped_large_deviation");
  assert.equal(normalization.table_outer_diameter_mm,22);
  assert.equal(normalization.within_recommended_tolerance,false);
  assert.equal(tube.diameterIndex,6);
  assert.equal(tube.toolingId,null);
  assert.equal(tube.importValidation.productionBlocked,true);
  assert.ok(tube.importValidation.issues.some((x)=>/exceeds 0\.350 mm/i.test(x)));
});

test("A31: project normalization touches only imported DWFx tubes",()=>{
  const project={
    id:"p",
    tubes:[
      importedTube(19.04999999,{metadataOd:19.05}),
      {
        id:"manual",
        name:"Manual",
        diameterIndex:2,
        toolingId:"d127",
        rows:[{type:"LINE",L:10}]
      }
    ]
  };

  const result=normalizeImportedProjectDiameters(project,catalog);
  assert.equal(result.status,"normalized");
  assert.equal(result.normalized_count,1);
  assert.equal(result.project.tubes[0].diameterIndex,5);
  assert.equal(result.project.tubes[0].toolingId,null);
  assert.equal(result.project.tubes[1].diameterIndex,2);
  assert.equal(result.project.tubes[1].toolingId,"d127");
});
