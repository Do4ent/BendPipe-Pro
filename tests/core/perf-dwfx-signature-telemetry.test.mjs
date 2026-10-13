import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

test("DWFx fallback signature reports costs while retaining mutation detection",()=>{
  const source=fs.readFileSync(new URL("../../src/import/dwfx/reference-scene-ui.js",import.meta.url),"utf8");
  const start=source.indexOf("  const signatureStats=");
  const end=source.indexOf("  // Preserve shared imported scene",start);
  assert.ok(start>0&&end>start);
  let now=0;
  const context={
    meshNow:()=>++now,
    bulkSelected:new Set(),
    window:{},
    revisionSnapshot:()=>({geometry:0,display:0,selection:0})
  };
  vm.createContext(context);
  vm.runInContext(source.slice(start,end)+"\nthis.signature=referenceSignature;this.stats=signatureStats;",context);
  const project={referenceScenes:[{tree:[{id:"A"}]}],editable_mesh_instances:[],tubes:[]};
  const old=context.signature(project,1);
  project.referenceScenes[0].tree[0].id="B";
  const next=context.signature(project,1);
  assert.notEqual(old,next);
  assert.equal(context.stats.calls,2);
  assert.ok(context.stats.totalMs>=2);
  assert.ok(context.stats.maxMs>=1);
  assert.ok(context.stats.lastMs>=1);
  assert.match(source,/signatureStats:\(\)=>\(\{\.\.\.signatureStats\}\)/);
});
