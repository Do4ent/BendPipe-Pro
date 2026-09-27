import test from "node:test";
import assert from "node:assert/strict";

import {
  roundImportedLinearMm,
  roundEditableTubeLinearDimensions,
  roundDwfxAssemblyLinearDimensions
} from "../../src/import/dwfx/editable-linear-rounding.mjs";

function tube(){
  return {
    id:"dwfx:10102217",
    name:"10102217",
    partNumber:"10102217",
    origin:{
      x:353.4770011901855,
      y:100.55765368504771,
      z:657.849999997579
    },
    startVector:{x:-1,y:0,z:0},
    rows:[
      {type:"LINE",L:10.0000001,LFormula:"10.0000001"},
      {type:"BEND",angle:90,angleFormula:"90",plane:"XY",rot:0,rotFormula:"0",clr:34.999999750254474,clrSource:"recognized_canonical_geometry"},
      {type:"LINE",L:113.41737747192383,LFormula:"113.41737747192383"},
      {type:"BEND",angle:15,angleFormula:"15",plane:"XZ",rot:0,rotFormula:"0",clr:50.00004630782671,clrSource:"recognized_canonical_geometry"},
      {type:"LINE",L:583.4173748876601,LFormula:"583.4173748876601"}
    ],
    diameterIndex:1,
    toolingId:null,
    importEvidence:{
      source:{format:"DWFx",file:"80004806.dwfx"},
      spatialPlacement:{
        status:"exact",
        origin_mm:[
          353.4770011901855,
          100.55765368504771,
          657.849999997579
        ],
        start_vector:[-1,0,0],
        machine_compensation_applied:false
      },
      canonicalGeometry:{primitives:["source remains untouched"]}
    },
    importValidation:{productionBlocked:true}
  };
}

test("A36: nearest millimetre uses symmetric half-away-from-zero rounding",()=>{
  assert.equal(roundImportedLinearMm(14.49),14);
  assert.equal(roundImportedLinearMm(14.5),15);
  assert.equal(roundImportedLinearMm(14.51),15);
  assert.equal(roundImportedLinearMm(-14.49),-14);
  assert.equal(roundImportedLinearMm(-14.5),-15);
  assert.equal(roundImportedLinearMm(-14.51),-15);
});

test("A36: imported editable tube rounds origin LINE and CLR to whole millimetres",()=>{
  const source=tube();
  const before=JSON.parse(JSON.stringify(source));
  const result=roundEditableTubeLinearDimensions(source,{increment_mm:1});
  const rounded=result.tube;

  assert.deepEqual(rounded.origin,{x:353,y:101,z:658});
  assert.deepEqual(
    rounded.rows.map((row)=>row.type==="LINE"?row.L:row.clr),
    [10,35,113,50,583]
  );
  assert.deepEqual(
    rounded.rows.filter((row)=>row.type==="LINE").map((row)=>row.LFormula),
    ["10","113","583"]
  );

  assert.equal(rounded.rows[1].angle,90);
  assert.equal(rounded.rows[3].angle,15);
  assert.equal(rounded.rows[1].rot,0);
  assert.equal(rounded.rows[3].rot,0);
  assert.equal(rounded.diameterIndex,1);
  assert.equal(rounded.toolingId,null);
  assert.deepEqual(rounded.startVector,{x:-1,y:0,z:0});

  assert.deepEqual(
    rounded.importEvidence.spatialPlacement.origin_mm,
    before.importEvidence.spatialPlacement.origin_mm
  );
  assert.deepEqual(
    rounded.importEvidence.spatialPlacement.editable_origin_mm,
    [353,101,658]
  );
  assert.deepEqual(
    rounded.importEvidence.linearDimensionNormalization.source_origin_mm,
    before.importEvidence.spatialPlacement.origin_mm
  );
  assert.deepEqual(
    rounded.importEvidence.linearDimensionNormalization.editable_origin_mm,
    [353,101,658]
  );
  assert.equal(
    rounded.importEvidence.linearDimensionNormalization.table_diameter_unchanged,
    true
  );
  assert.equal(rounded.importValidation.linearDimensionsRoundedToMm,true);
  assert.equal(rounded.importValidation.linearDimensionIncrementMm,1);

  // Pure transform: exact source object must not be mutated.
  assert.deepEqual(source,before);
});

test("A36: real 10102202 values round without changing angles or table diameter",()=>{
  const source=tube();
  source.partNumber="10102202";
  source.origin={x:85.62700272800446,y:214.13457870483398,z:234.32672500610352};
  source.importEvidence.spatialPlacement.origin_mm=[
    85.62700272800446,214.13457870483398,234.32672500610352
  ];
  source.diameterIndex=3;
  source.rows=[
    {type:"LINE",L:286.45999908447266,LFormula:"286.45999908447266"},
    {type:"BEND",angle:90,angleFormula:"90",plane:"XY",rot:0,rotFormula:"0",clr:50.00000355720564},
    {type:"LINE",L:130,LFormula:"130"}
  ];

  const {tube:rounded}=roundEditableTubeLinearDimensions(source);
  assert.deepEqual(rounded.origin,{x:86,y:214,z:234});
  assert.equal(rounded.rows[0].L,286);
  assert.equal(rounded.rows[1].clr,50);
  assert.equal(rounded.rows[2].L,130);
  assert.equal(rounded.rows[1].angle,90);
  assert.equal(rounded.diameterIndex,3);
});

test("A36: assembly rounding is applied to every imported tube",()=>{
  const a=tube();
  const b=tube();
  b.id="dwfx:2";
  b.partNumber="2";
  b.origin={x:85.627,y:692.823,z:244.604};
  b.importEvidence.spatialPlacement.origin_mm=[85.627,692.823,244.604];
  b.rows=[{type:"LINE",L:37.00000047683716,LFormula:"37.00000047683716"}];

  const result=roundDwfxAssemblyLinearDimensions({
    status:"assembly_candidate",
    editable_ready:true,
    production_ready:false,
    tubes:[a,b]
  });

  assert.equal(result.status,"rounded_assembly");
  assert.equal(result.tube_count,2);
  assert.deepEqual(result.assembly.tubes[0].origin,{x:353,y:101,z:658});
  assert.deepEqual(result.assembly.tubes[1].origin,{x:86,y:693,z:245});
  assert.equal(result.assembly.tubes[1].rows[0].L,37);
  assert.equal(result.production_ready,false);
});


test("A37: bend CLR always rounds to whole mm and only near-integer angles round",()=>{
  const source=tube();
  source.rows=[
    {type:"LINE",L:100.2,LFormula:"100.2"},
    {type:"BEND",angle:90.00169482333327,angleFormula:"90.00169482333327",plane:"XY",rot:0,rotFormula:"0",clr:14.99990365405163},
    {type:"LINE",L:80.1,LFormula:"80.1"},
    {type:"BEND",angle:3.036439962824889,angleFormula:"3.036439962824889",plane:"XZ",rot:0,rotFormula:"0",clr:39.998977876168375},
    {type:"LINE",L:50.4,LFormula:"50.4"}
  ];

  const result=roundEditableTubeLinearDimensions(source);
  const bends=result.tube.rows.filter((row)=>row.type==="BEND");

  assert.equal(bends[0].clr,15);
  assert.equal(bends[0].angle,90);
  assert.equal(bends[0].angleFormula,"90");

  assert.equal(bends[1].clr,40);
  assert.equal(bends[1].angle,3.036439962824889);
  assert.equal(bends[1].angleFormula,"3.036439962824889");

  assert.equal(result.normalization.bend_angle_integer_tolerance_deg,0.01);
  assert.equal(result.normalization.bend_radius_rule,"nearest_whole_mm_half_away_from_zero");
  assert.equal(result.normalization.angle_changes.length,1);
  assert.equal(result.angle_changed_count,1);
  assert.equal(result.tube.importValidation.bendRadiiRoundedToWholeMm,true);
  assert.equal(result.tube.importValidation.bendAnglesRoundedNearInteger,true);
});
