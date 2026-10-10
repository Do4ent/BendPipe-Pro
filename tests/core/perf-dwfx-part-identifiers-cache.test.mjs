import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function signatureHarness(){
  const source=fs.readFileSync(new URL("../../src/import/dwfx/reference-scene-ui.js",import.meta.url),"utf8");
  const start=source.indexOf("  const signatureStats=");
  const end=source.indexOf("  // Preserve shared imported scene",start);
  assert.ok(start>0&&end>start,"signature section exists");
  const context={
    meshNow:()=>0,
    bulkSelected:new Set(),
    window:{TubeBenderObjectContext:{selectionEntries:()=>[]}},
    revisionSnapshot:()=>({geometry:0,display:0,selection:0})
  };
  vm.createContext(context);
  vm.runInContext(source.slice(start,end)+"\nthis.sign=referenceSignature;",context);
  return (project)=>context.sign(project,1);
}

test("all four DWFx suppression identifiers invalidate the conservative cache key",()=>{
  const sign=signatureHarness();
  const tube={
    id:"tube-1",partNumber:"preferred",part_number:"legacy",
    importEvidence:{part_number:"evidence"},
    currentProjectImport:{part_number:"imported",source_format:"DWFx",source_link:null},
    rows:[{type:"STRAIGHT",length:10}]
  };
  const project={tubes:[tube],referenceScenes:[{id:"scene",tree:[]}],editable_mesh_instances:[]};
  const initial=sign(project);
  const fields=[
    ["partNumber","other-preferred"],
    ["part_number","other-legacy"],
    ["importEvidence.part_number","other-evidence"],
    ["currentProjectImport.part_number","other-imported"]
  ];
  for(const [path,value] of fields){
    const parts=path.split(".");
    const target=parts.length===1?tube:tube[parts[0]];
    const key=parts.at(-1);
    const old=target[key];
    target[key]=value;
    assert.notEqual(sign(project),initial,path+" must invalidate cached scene");
    target[key]=old;
    assert.equal(sign(project),initial,path+" restored to original");
  }
  tube.rows[0].length=50;
  assert.equal(sign(project),initial,"unrelated tube length remains outside DWFx key");
});

test("changing legacy alias remains observable while preferred alias is defined",()=>{
  const sign=signatureHarness();
  const project={
    referenceScenes:[],editable_mesh_instances:[],
    tubes:[{id:"t",partNumber:"A",part_number:"B",importEvidence:{part_number:"C"}}]
  };
  const before=sign(project);
  project.tubes[0].part_number="D";
  assert.notEqual(sign(project),before);
});
