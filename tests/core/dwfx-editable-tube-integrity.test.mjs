import test from "node:test";
import assert from "node:assert/strict";

import { repairRoundedTubeContinuity } from "../../src/import/dwfx/editable-tube-integrity.mjs";

function tube(){
  return {
    id:"dwfx:T",
    name:"T",
    partNumber:"T",
    origin:{x:10,y:20,z:30},
    startVector:{x:1,y:0,z:0},
    startAxis:"X",
    rows:[
      {type:"LINE",L:100,LFormula:"100"},
      {type:"BEND",angle:90,angleFormula:"90.00",plane:"XY",rot:0,rotFormula:"0",clr:35},
      {type:"LINE",L:80,LFormula:"80"},
      {type:"BEND",angle:3.04,angleFormula:"3.04",plane:"XY",rot:0,rotFormula:"0",clr:40},
      {type:"LINE",L:50,LFormula:"50"}
    ],
    importEvidence:{
      spatialPlacement:{
        status:"exact",
        axis_parallel_normalization:{
          status:"applied",
          tolerance_deg:0.25,
          lines:[
            {primitive_index:0,status:"axis_parallel",parallel_axis:"+X",editable_direction:[1,0,0]},
            {primitive_index:2,status:"axis_parallel",parallel_axis:"+Y",editable_direction:[0,1,0]},
            {primitive_index:4,status:"free_direction",parallel_axis:null,editable_direction:[0.05301933598375618,0.9985934208065464,0]}
          ]
        }
      }
    },
    importValidation:{productionBlocked:true}
  };
}

test("A38: rounded LINE/BEND rows are rebuilt as one continuous tangent tube",()=>{
  const result=repairRoundedTubeContinuity(tube());
  assert.equal(result.status,"continuous_tube");
  assert.equal(result.integrity.single_continuous_tube,true);
  assert.equal(result.integrity.geometry_rebuilt_from_rounded_rows,true);
  assert.equal(result.integrity.element_count,5);
  assert.equal(result.integrity.join_count,4);
  assert.ok(result.integrity.max_endpoint_gap_mm<=1e-12);
  assert.ok(result.integrity.max_tangency_error_deg<=1e-6);
  assert.equal(result.integrity.axis_checks.length,2);
  assert.ok(result.integrity.axis_checks.every((item)=>item.passed));
  assert.equal(result.tube.importValidation.singleContinuousTube,true);
  assert.equal(result.tube.importValidation.continuityCorrectedAfterRounding,true);

  for(const join of result.integrity.joins){
    assert.ok(join.gap_mm<=1e-12);
    assert.ok(join.tangency_error_deg<=1e-6);
    assert.equal(join.passed,true);
  }

  for(let i=1;i<result.integrity.elements.length;i+=1){
    assert.deepEqual(
      result.integrity.elements[i-1].end,
      result.integrity.elements[i].start
    );
  }
});

test("A38: malformed rounded topology is blocked instead of guessed",()=>{
  const source=tube();
  source.rows=[
    {type:"LINE",L:100,LFormula:"100"},
    {type:"LINE",L:80,LFormula:"80"}
  ];
  const result=repairRoundedTubeContinuity(source);
  assert.equal(result.status,"blocked");
  assert.match(result.blocker,/alternate LINE\/BEND\/LINE/i);
});

test("A38: axis classification remains fail-closed after rounded replay",()=>{
  const source=tube();
  source.importEvidence.spatialPlacement.axis_parallel_normalization.lines=[
    {primitive_index:0,status:"axis_parallel",parallel_axis:"+Y",editable_direction:[0,1,0]}
  ];
  const result=repairRoundedTubeContinuity(source);
  assert.equal(result.status,"blocked");
  assert.match(result.blocker,/axis alignment/i);
  assert.ok(result.axis_deviation_deg>0.25);
});


test("A38: real 10141451 rounded rows pass continuity despite floating-point tangent noise",()=>{
  const source={
    id:"dwfx:10141451",
    name:"10141451",
    partNumber:"10141451",
    origin:{x:259,y:436,z:585},
    startVector:{x:0,y:1,z:0},
    startAxis:"Y",
    rows:[
      {type:"LINE",L:40,LFormula:"40"},
      {type:"BEND",angle:90,angleFormula:"90.00",plane:"XZ",rot:-40,rotFormula:"-40",clr:65},
      {type:"LINE",L:5,LFormula:"5"},
      {type:"BEND",angle:90,angleFormula:"90.00",plane:"XZ",rot:90,rotFormula:"90",clr:65},
      {type:"LINE",L:90,LFormula:"90"},
      {type:"BEND",angle:90,angleFormula:"90.00",plane:"XY",rot:90,rotFormula:"90",clr:65},
      {type:"LINE",L:28,LFormula:"28"},
      {type:"BEND",angle:90,angleFormula:"90.00",plane:"XZ",rot:-90,rotFormula:"-90",clr:65},
      {type:"LINE",L:306,LFormula:"306"},
      {type:"BEND",angle:90,angleFormula:"90.00",plane:"XY",rot:0,rotFormula:"0",clr:65},
      {type:"LINE",L:39,LFormula:"39"}
    ],
    importEvidence:{
      spatialPlacement:{
        status:"exact",
        axis_parallel_normalization:{
          status:"applied",
          tolerance_deg:0.25,
          lines:[
            {primitive_index:0,status:"axis_parallel",parallel_axis:"+Y",editable_direction:[0,1,0]},
            {primitive_index:2,status:"free_direction",parallel_axis:null,editable_direction:[0.6427876129326131,0,-0.7660444403951986]},
            {primitive_index:4,status:"axis_parallel",parallel_axis:"-Y",editable_direction:[0,-1,0]},
            {primitive_index:6,status:"axis_parallel",parallel_axis:"+Z",editable_direction:[0,0,1]},
            {primitive_index:8,status:"axis_parallel",parallel_axis:"+Y",editable_direction:[0,1,0]},
            {primitive_index:10,status:"axis_parallel",parallel_axis:"-X",editable_direction:[-1,0,0]}
          ]
        }
      }
    },
    importValidation:{productionBlocked:true}
  };

  const result=repairRoundedTubeContinuity(source);
  assert.equal(result.status,"continuous_tube");
  assert.equal(result.integrity.single_continuous_tube,true);
  assert.equal(result.integrity.tangency_tolerance_deg,1e-5);
  assert.ok(result.integrity.max_tangency_error_deg<1e-5);
  assert.ok(result.integrity.max_tangency_error_deg>1e-8);
});
