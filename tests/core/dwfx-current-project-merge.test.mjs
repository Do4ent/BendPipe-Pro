import test from "node:test";
import assert from "node:assert/strict";

import { mergeDwfxTubesIntoCurrentProject } from "../../src/import/dwfx/current-project-merge.mjs";

function tube(name,id=""){
  return {
    id,
    name,
    partNumber:name,
    rows:[
      {type:"LINE",L:100},
      {type:"BEND",angle:90,plane:"XY",rot:0,clr:50},
      {type:"LINE",L:120}
    ],
    toolingId:"should-not-survive",
    toolingUnresolved:false,
    diameterIndex:4,
    importEvidence:{
      source:{format:"DWFx",file:"sample.dwfx"},
      machineCompensationApplied:false
    },
    importValidation:{
      productionBlocked:true,
      toolingResolved:false
    }
  };
}

test("DWFx current-project merge appends selected editable tubes without replacing project settings",()=>{
  let id=0;
  const result=mergeDwfxTubesIntoCurrentProject({
    project:{
      id:"project-1",
      name:"Current",
      bbox:{x:1000,y:800,z:600},
      tubes:[{id:"existing-1",name:"Existing",rows:[{type:"LINE",L:50}]}]
    },
    imported_projects:[{
      id:"import-p",
      name:"Imported",
      tubes:[tube("10102202"),tube("10102217")]
    }],
    conflict:"copy",
    make_id:()=> "new-"+(++id),
    source_file:"80004806.dwfx"
  });

  assert.equal(result.status,"merged");
  assert.equal(result.imported_count,2);
  assert.equal(result.project.id,"project-1");
  assert.deepEqual(result.project.bbox,{x:1000,y:800,z:600});
  assert.equal(result.project.tubes.length,3);
  assert.deepEqual(result.imported_tube_ids,["new-1","new-2"]);

  for(const imported of result.project.tubes.slice(1)){
    assert.equal(imported.toolingId,null);
    assert.equal(imported.toolingUnresolved,true);
    assert.equal(imported.diameterIndex,null);
    assert.equal(imported.importValidation.productionBlocked,true);
    assert.equal(imported.importValidation.importedIntoCurrentProject,true);
    assert.equal(imported.currentProjectImport.source_file,"80004806.dwfx");
    assert.equal(imported.currentProjectImport.machine_compensation_applied,false);
  }
});

test("DWFx current-project merge copy mode keeps existing tube and creates unique imported name",()=>{
  const result=mergeDwfxTubesIntoCurrentProject({
    project:{
      id:"p",
      tubes:[{id:"a",name:"10102202",rows:[{type:"LINE",L:10}]}]
    },
    imported_projects:[{tubes:[tube("10102202","b")]}],
    conflict:"copy",
    make_id:()=> "unused"
  });

  assert.equal(result.imported_count,1);
  assert.equal(result.project.tubes.length,2);
  assert.equal(result.project.tubes[0].name,"10102202");
  assert.equal(result.project.tubes[1].name,"10102202 copy");
});

test("DWFx current-project merge replace mode replaces same-name tube but not the project",()=>{
  const result=mergeDwfxTubesIntoCurrentProject({
    project:{
      id:"p",
      name:"Current project",
      tubes:[
        {id:"old",name:"10102202",rows:[{type:"LINE",L:10}]},
        {id:"keep",name:"Keep",rows:[{type:"LINE",L:20}]}
      ]
    },
    imported_projects:[{tubes:[tube("10102202","incoming")]}],
    conflict:"replace",
    make_id:()=> "unused"
  });

  assert.equal(result.replaced_count,1);
  assert.equal(result.project.id,"p");
  assert.equal(result.project.name,"Current project");
  assert.deepEqual(result.project.tubes.map((t)=>t.name),["Keep","10102202"]);
  assert.equal(result.project.tubes.at(-1).id,"incoming");
});

test("DWFx current-project merge skip mode imports only non-conflicting selected tubes",()=>{
  let id=0;
  const result=mergeDwfxTubesIntoCurrentProject({
    project:{
      id:"p",
      tubes:[{id:"old",name:"10102202",rows:[{type:"LINE",L:10}]}]
    },
    imported_projects:[{tubes:[tube("10102202"),tube("10102217")]}],
    conflict:"skip",
    make_id:()=> "new-"+(++id)
  });

  assert.equal(result.imported_count,1);
  assert.equal(result.skipped_count,1);
  assert.deepEqual(result.skipped_names,["10102202"]);
  assert.equal(result.project.tubes.at(-1).name,"10102217");
});

test("DWFx current-project merge rejects non-editable imported evidence",()=>{
  assert.throws(
    ()=>mergeDwfxTubesIntoCurrentProject({
      project:{id:"p",tubes:[]},
      imported_projects:[{tubes:[{id:"x",name:"metadata only",rows:[]}]}],
      make_id:()=> "id"
    }),
    /editable rows/
  );
});


test("A25: current-project merge carries readonly reference scene source tree without heavy runtime payload",()=>{
  const referenceScene={
    id:"dwfx-reference:sample.dwfx",
    runtime_scene_id:"dwfx-reference:sample.dwfx",
    source_file:"sample.dwfx",
    readonly:true,
    visible:true,
    tree:[{
      id:"root",
      label:"Assembly",
      readonly:true,
      role:"group",
      geometry_instances:[],
      children:[{
        id:"part",
        label:"Bracket",
        readonly:true,
        role:"reference_object",
        geometry_status:"exact",
        geometry_instances:[{
          asset_id:"?Include Library/42",
          status:"exact",
          placement_matrix:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]
        }],
        children:[]
      }]
    }],
  };

  const result=mergeDwfxTubesIntoCurrentProject({
    project:{
      id:"p",
      name:"Current",
      tubes:[{id:"existing",name:"Existing",rows:[{type:"LINE",L:10}]}],
      referenceScenes:[]
    },
    imported_projects:[{
      id:"imp",
      tubes:[tube("10102202","tube-import")],
      referenceScenes:[referenceScene]
    }],
    conflict:"copy",
    make_id:()=> "unused",
    source_file:"sample.dwfx"
  });

  assert.equal(result.status,"merged");
  assert.equal(result.imported_count,1);
  assert.equal(result.imported_reference_scene_count,1);
  assert.equal(result.project.referenceScenes.length,1);
  assert.equal(result.project.referenceScenes[0].readonly,true);
  assert.equal(result.project.referenceScenes[0].tree[0].children[0].label,"Bracket");
  assert.equal(result.project.referenceScenes[0].display_runtime,undefined);
  assert.equal(result.production_ready,false);
});


test("A31: current-project merge rounds imported OD to active table without selecting tooling",()=>{
  const source=tube("10102217","incoming");
  source.importEvidence.recognitionSummary={
    dimension_source:"geometry_derived",
    dimension_reconciliation:{
      derived_outer_diameter_mm:9.700000225
    }
  };
  source.importEvidence.metadata={outer_diameter_mm:9.525};

  const result=mergeDwfxTubesIntoCurrentProject({
    project:{id:"p",tubes:[]},
    imported_projects:[{tubes:[source]}],
    conflict:"copy",
    make_id:()=> "unused",
    diameter_catalog:[
      {id:"6",mm:6.35,Rb:15},
      {id:"9",mm:9.53,Rb:25},
      {id:"12",mm:12.7,Rb:40}
    ]
  });

  const imported=result.project.tubes[0];
  assert.equal(imported.diameterIndex,1);
  assert.equal(imported.toolingId,null);
  assert.equal(imported.toolingUnresolved,true);
  assert.equal(imported.importEvidence.diameterNormalization.table_outer_diameter_mm,9.53);
  assert.equal(imported.importEvidence.diameterNormalization.source_outer_diameter_mm,9.700000225);
  assert.equal(imported.importValidation.productionBlocked,true);
});


test("A35: merge restores exact imported origin from spatial evidence even if source origin is stale zero",()=>{
  const source=tube("10102217","incoming");
  source.origin={x:0,y:0,z:0};
  source.startVector={x:-1,y:0,z:0};
  source.importEvidence.spatialPlacement={
    status:"exact",
    origin_mm:[353.4770011901855,100.55765368504771,657.849999997579],
    start_vector:[-1,0,0],
    placement_source:"dwfx_reference_scene_exact_instance",
    machine_compensation_applied:false
  };

  const result=mergeDwfxTubesIntoCurrentProject({
    project:{id:"p",tubes:[]},
    imported_projects:[{tubes:[source]}],
    conflict:"copy",
    make_id:()=> "unused"
  });

  const imported=result.project.tubes[0];
  assert.deepEqual(imported.origin,{
    x:353,
    y:101,
    z:658
  });
  assert.deepEqual(imported.importEvidence.spatialPlacement.origin_mm,[
    353.4770011901855,
    100.55765368504771,
    657.849999997579
  ]);
  assert.deepEqual(imported.importEvidence.spatialPlacement.editable_origin_mm,[353,101,658]);
  assert.equal(imported.importEvidence.spatialPlacement.editable_origin_seeded,true);
  assert.equal(imported.importEvidence.spatialPlacement.user_origin_override,false);
  assert.equal(imported.importValidation.productionBlocked,true);
});


test("A36: current-project merge rounds imported editable LINE CLR and origin to 1 mm",()=>{
  const source=tube("10102217","incoming");
  source.origin={x:353.4770011901855,y:100.55765368504771,z:657.849999997579};
  source.rows=[
    {type:"LINE",L:10.0000001,LFormula:"10.0000001"},
    {type:"BEND",angle:90,plane:"XY",rot:0,clr:34.999999750254474},
    {type:"LINE",L:113.41737747192383,LFormula:"113.41737747192383"}
  ];
  source.importEvidence.spatialPlacement={
    status:"exact",
    origin_mm:[353.4770011901855,100.55765368504771,657.849999997579],
    start_vector:[-1,0,0],
    machine_compensation_applied:false
  };

  const result=mergeDwfxTubesIntoCurrentProject({
    project:{id:"p",tubes:[]},
    imported_projects:[{tubes:[source]}],
    conflict:"copy",
    make_id:()=> "unused",
    linear_rounding_increment_mm:1
  });

  const imported=result.project.tubes[0];
  assert.deepEqual(imported.origin,{x:353,y:101,z:658});
  assert.equal(imported.rows[0].L,10);
  assert.equal(imported.rows[1].clr,35);
  assert.equal(imported.rows[2].L,113);
  assert.equal(imported.rows[1].angle,90);
  assert.equal(imported.importEvidence.linearDimensionNormalization.increment_mm,1);
  assert.equal(imported.importValidation.linearDimensionsRoundedToMm,true);
  assert.equal(imported.importValidation.productionBlocked,true);
});


test("A62: current-project import automatically corrects recognized CLR to active technology",()=>{
  const source=tube("10102217","incoming");
  source.origin={x:0,y:0,z:0};
  source.startVector={x:1,y:0,z:0};
  source.rows=[
    {type:"LINE",L:100},
    {type:"BEND",angle:90,plane:"XY",rot:0,clr:31},
    {type:"LINE",L:120}
  ];
  source.importEvidence.metadata={outer_diameter_mm:9.53};
  source.importEvidence.canonicalGeometry={
    primitives:[
      {type:"LINE"},
      {type:"BEND",clr:{value:31.2}},
      {type:"LINE"}
    ]
  };

  const result=mergeDwfxTubesIntoCurrentProject({
    project:{id:"p",tubes:[]},
    imported_projects:[{tubes:[source]}],
    conflict:"copy",
    make_id:()=> "unused",
    diameter_catalog:[
      {id:"tool-9-r25",mm:9.53,Rb:25},
      {id:"tool-12-r40",mm:12.7,Rb:40}
    ]
  });

  const imported=result.project.tubes[0];
  assert.equal(imported.rows[1].clr,25);
  assert.equal(imported.rows[1].clrSource,"technology_table_normalization");
  assert.equal(imported.toolingId,null);
  assert.equal(imported.toolingUnresolved,true);
  assert.equal(
    imported.importEvidence.technologicalRadiusNormalization.target_clr_mm,
    25
  );
  assert.deepEqual(
    imported.importEvidence.technologicalRadiusNormalization.recognized_clrs_mm,
    [31.2]
  );
});
