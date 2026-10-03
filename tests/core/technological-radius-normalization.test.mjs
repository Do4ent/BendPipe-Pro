import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeImportedTubeBendRadiiToTechnology,
  normalizeImportedProjectBendRadiiToTechnology
} from "../../src/import/dwfx/technological-radius-normalization.mjs";

function importedTube(){
  return {
    id:"tube-1",
    name:"Imported",
    origin:{x:0,y:0,z:0},
    startVector:{x:1,y:0,z:0},
    diameterIndex:0,
    toolingId:null,
    toolingUnresolved:true,
    rows:[
      {type:"LINE",L:100,LFormula:"100"},
      {type:"BEND",angle:90,angleFormula:"90.00",plane:"XY",rot:0,rotFormula:"0.00",clr:23},
      {type:"LINE",L:80,LFormula:"80"},
      {type:"BEND",angle:45,angleFormula:"45.00",plane:"XZ",rot:0,rotFormula:"0.00",clr:27},
      {type:"LINE",L:60,LFormula:"60"}
    ],
    importEvidence:{
      source:{format:"DWFx",file:"sample.dwfx"},
      diameterNormalization:{
        status:"snapped",
        table_outer_diameter_mm:9.53,
        table_index:0
      },
      canonicalGeometry:{
        primitives:[
          {type:"LINE"},
          {type:"BEND",clr:{value:23.2}},
          {type:"LINE"},
          {type:"BEND",clr:{value:26.7}},
          {type:"LINE"}
        ]
      }
    },
    importValidation:{
      productionBlocked:true,
      toolingResolved:false
    }
  };
}

const catalog=[
  {id:"r20",mm:9.53,Rb:20},
  {id:"r25",mm:9.53,Rb:25},
  {id:"r40",mm:12.7,Rb:40}
];

test("A62: recognized bends normalize to one nearest technological radius for the tube",()=>{
  const source=importedTube();
  const result=normalizeImportedTubeBendRadiiToTechnology(source,catalog);

  assert.equal(result.status,"corrected");
  assert.equal(result.changed_count,2);
  assert.deepEqual(
    result.tube.rows.filter((row)=>row.type==="BEND").map((row)=>row.clr),
    [25,25]
  );
  assert.equal(result.tube.diameterIndex,1);
  assert.equal(result.tube.toolingId,null);
  assert.equal(result.tube.toolingUnresolved,true);
  assert.equal(
    result.tube.importEvidence.technologicalRadiusNormalization.target_clr_mm,
    25
  );
  assert.equal(
    result.tube.importEvidence.technologicalRadiusNormalization.rule,
    "single_common_nearest_available_radius_minimax"
  );
  assert.deepEqual(
    result.tube.importEvidence.technologicalRadiusNormalization.recognized_clrs_mm,
    [23.2,26.7]
  );
  assert.equal(
    result.tube.importValidation.technologicalRadiusNormalized,
    true
  );
  assert.equal(result.tube.importValidation.toolingResolved,false);
});

test("A62: canonical recognized CLR evidence is never rewritten by technological normalization",()=>{
  const source=importedTube();
  const before=JSON.stringify(source.importEvidence.canonicalGeometry);
  const result=normalizeImportedTubeBendRadiiToTechnology(source,catalog);

  assert.equal(
    JSON.stringify(result.tube.importEvidence.canonicalGeometry),
    before
  );
  assert.equal(
    JSON.stringify(source.importEvidence.canonicalGeometry),
    before
  );
});

test("A62: missing technological radius leaves editable CLR unchanged and records unresolved status",()=>{
  const source=importedTube();
  source.importEvidence.diameterNormalization.table_outer_diameter_mm=8;
  const result=normalizeImportedTubeBendRadiiToTechnology(source,catalog);

  assert.equal(result.status,"unresolved");
  assert.deepEqual(
    result.tube.rows.filter((row)=>row.type==="BEND").map((row)=>row.clr),
    [23,27]
  );
  assert.equal(
    result.tube.importEvidence.technologicalRadiusNormalization.status,
    "unresolved"
  );
  assert.equal(result.tube.toolingId,null);
  assert.equal(result.tube.toolingUnresolved,true);
});

test("A62: project normalization applies only to recognized imported tubes",()=>{
  const imported=importedTube();
  const manual={
    id:"manual",
    rows:[
      {type:"LINE",L:10},
      {type:"BEND",angle:90,plane:"XY",rot:0,clr:33},
      {type:"LINE",L:10}
    ]
  };
  const result=normalizeImportedProjectBendRadiiToTechnology(
    {id:"p",tubes:[imported,manual]},
    catalog
  );

  assert.equal(result.status,"normalized");
  assert.equal(result.normalized_count,1);
  assert.equal(result.changed_count,2);
  assert.deepEqual(
    result.project.tubes[0].rows.filter((row)=>row.type==="BEND").map((row)=>row.clr),
    [25,25]
  );
  assert.equal(result.project.tubes[1].rows[1].clr,33);
});
