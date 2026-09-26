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
