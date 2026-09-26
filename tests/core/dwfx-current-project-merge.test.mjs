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


test("A25: current-project merge carries readonly reference scene with source tree and display runtime",()=>{
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
    display_runtime:{
      scene_id:"dwfx-reference:sample.dwfx",
      readonly:true,
      scale_mm_per_source_unit:10,
      assets:[{
        id:"?Include Library/42",
        status:"exact",
        kind:"line_segments",
        meshes:[],
        line_segments:{positions:[0,0,0,1,0,0],color_rgb:[120,130,140]}
      }]
    }
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
  assert.equal(
    result.project.referenceScenes[0].display_runtime.assets[0].id,
    "?Include Library/42"
  );
  assert.equal(result.production_ready,false);
});
