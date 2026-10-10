import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

test("PERF-001: project DWFx source and editable-part index reads each tube import state once",()=>{
  const source=fs.readFileSync(new URL("../../src/import/dwfx/reference-scene-ui.js",import.meta.url),"utf8");
  const expose=source.replace(
    "  window.TubeBenderReferenceSceneUi=Object.freeze({",
    "  window.__testBuildSourceIndex=buildProjectSourceRenderIndex;\n  window.TubeBenderReferenceSceneUi=Object.freeze({"
  );
  assert.notEqual(expose,source,"source index injection anchor should exist");
  const window={TubeBenderObjectContext:{selectionEntries:()=>[{kind:"tube",tubeId:"linked"}]}};
  vm.runInNewContext(expose,{window,setTimeout,clearTimeout,globalThis:{}});
  let importStateReads=0;
  const tubes=Array.from({length:2000},(_,index)=>{
    const imported={
      part_number:index===20?"007":null,
      source_link:index===1
        ? {scene_id:"scene",node_id:"node",detached:true}
        : index===2
          ? {scene_id:"scene",node_id:"node",display:"compare"}
          : null
    };
    return {
      id:index===2?"linked":String(index),
      partNumber:index===3?0:null,
      importEvidence:index===4?{part_number:"evidence-part"}:null,
      get currentProjectImport(){importStateReads++;return imported;}
    };
  });
  const index=window.__testBuildSourceIndex({
    tubes,editable_mesh_instances:[
      {id:"instance",link_status:"linked",source:{scene_id:"scene",node_id:"node"}}
    ]
  }).forScene("scene");
  assert.equal(importStateReads,2000,
    "indexing must not repeatedly read import state for each part and source link");
  assert.equal(index.firstAny.get("node").id,"1",
    "legacy first-match preference preserves detached source");
  assert.equal(index.firstLinked.get("node").id,"linked",
    "linked node selects first non-detached source");
  assert.equal(index.editableParts.has("007"),true,
    "imported part number must retain leading zeroes");
  assert.equal(index.editableParts.has("0"),true,
    "numeric zero is a valid non-empty part number");
  assert.equal(index.editableParts.has("evidence-part"),true);
  assert.equal(index.selectedTubeIds.has("linked"),true);
  assert.equal(index.meshByNode.get("node").length,1);
});
