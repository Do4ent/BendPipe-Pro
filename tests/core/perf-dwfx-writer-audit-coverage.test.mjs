import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function ui(){
  const window={};
  const script=fs.readFileSync(new URL("../../src/import/dwfx/reference-scene-ui.js",import.meta.url),"utf8");
  vm.runInNewContext(script,{window,setTimeout,clearTimeout,queueMicrotask,globalThis:{}});
  return window.TubeBenderReferenceSceneUi;
}

test("creating editable DWFx mesh increments source geometry revision",()=>{
  const api=ui(),project={editable_mesh_instances:[]};
  const before=api.revisionSnapshot().geometry;
  const instance=api.createEditableMeshInstance(project,{id:"scene"},{id:"node",label:"Body"});
  assert.ok(instance.id);
  assert.equal(project.editable_mesh_instances.length,1);
  assert.equal(api.revisionSnapshot().geometry,before+1);
});

test("all source-link and tree selection mutation writers signal revisions",()=>{
  const text=fs.readFileSync(new URL("../../src/import/dwfx/reference-scene-ui.js",import.meta.url),"utf8");
  for(const [functionName,revision] of [
    ["mutateSourceLinkDisplay","display"],
    ["breakSourceLink","geometry"],
    ["applyBulkDelete","geometry"],
    ["revealNode","selection"],
  ]){
    const start=text.indexOf("function "+functionName+"(");
    assert.ok(start>=0,functionName+" exists");
    const end=text.indexOf("\n  function ",start+10);
    const body=text.slice(start,end<0?undefined:end);
    assert.ok(body.includes('bumpRevision("'+revision+'")'),functionName+" must signal "+revision);
  }
});
