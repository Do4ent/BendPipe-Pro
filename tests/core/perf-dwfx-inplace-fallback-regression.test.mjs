import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

test("DWFx fallback signature changes for in-place nested geometry changes",()=>{
  const source=fs.readFileSync(new URL("../../src/import/dwfx/reference-scene-ui.js",import.meta.url),"utf8");
  const start=source.indexOf("  function referenceSignature(project,geomScale){");
  const end=source.indexOf("  // Preserve shared imported scene",start);
  assert.ok(start>=0&&end>start);
  const context={
    bulkSelected:new Set(),
    window:{TubeBenderObjectContext:{selectionEntries:()=>[]}},
    revisionSnapshot:()=>({geometry:0,display:0,selection:0})
  };
  vm.createContext(context);
  vm.runInContext(source.slice(start,end)+"\nthis.signature=referenceSignature;",context);
  const project={
    referenceScenes:[{id:"a",visible:true,tree:[{id:"n",geometry_instances:[{asset_id:"mesh"}]}]}],
    editable_mesh_instances:[],
    tubes:[]
  };
  const original=context.signature(project,1);
  const sameCollection=project.referenceScenes;
  project.referenceScenes[0].tree[0].geometry_instances[0].asset_id="changed";
  assert.equal(project.referenceScenes,sameCollection);
  assert.notEqual(context.signature(project,1),original,
    "untracked nested mutation must invalidate conservative signature");
  const changed=context.signature(project,1);
  project.referenceScenes[0].visible=false;
  assert.notEqual(context.signature(project,1),changed,
    "in-place display mutation must invalidate conservative signature");
});

test("conservative signature detects direct in-place source link edits",()=>{
  const source=fs.readFileSync(new URL("../../src/import/dwfx/reference-scene-ui.js",import.meta.url),"utf8");
  const start=source.indexOf("  function referenceSignature(project,geomScale){");
  const end=source.indexOf("  // Preserve shared imported scene",start);
  assert.ok(start>=0&&end>start);
  const context={bulkSelected:new Set(),window:{},revisionSnapshot:()=>({geometry:0})};
  vm.createContext(context);
  vm.runInContext(source.slice(start,end)+"\nthis.signature=referenceSignature;",context);
  const project={referenceScenes:[],editable_mesh_instances:[],tubes:[{
    id:"tube",currentProjectImport:{source_format:"DWFx",source_link:{scene_id:"a",node_id:"b"}}
  }]};
  const original=context.signature(project,1);
  project.tubes[0].currentProjectImport.source_link.node_id="c";
  assert.notEqual(context.signature(project,1),original);
});
