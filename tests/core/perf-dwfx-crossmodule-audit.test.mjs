import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function ui(){
  const window={};
  vm.runInNewContext(fs.readFileSync(new URL("../../src/import/dwfx/reference-scene-ui.js",import.meta.url),"utf8"),{window,setTimeout,clearTimeout,globalThis:{}});
  return window.TubeBenderReferenceSceneUi;
}

test("restoring persisted DWFx project always invalidates source scene revision",()=>{
  const api=ui(),before=api.revisionSnapshot().geometry;
  const count=api.restorePersistedRuntimes({referenceScenes:[]});
  assert.equal(count,0);
  assert.equal(api.revisionSnapshot().geometry,before+1);
  assert.equal(api.sceneReuseStats().invalidations,1);
});

test("current-project DWFx merge signals geometry revision after merged project is installed",()=>{
  const source=fs.readFileSync(new URL("../../src/import/dwfx/current-project-ui.js",import.meta.url),"utf8");
  const assign=source.indexOf("state.projects[projectIndex]=merged.project;");
  const notify=source.indexOf('markSceneChanged?.(merged.project,"geometry")');
  assert.ok(assign>=0&&notify>assign,"revision notification follows replacement");
});

test("conservative source signature remains for uninstrumented external link mutations",()=>{
  const source=fs.readFileSync(new URL("../../src/import/dwfx/reference-scene-ui.js",import.meta.url),"utf8");
  assert.match(source,/source:tube\?\.currentProjectImport\?\.source_link/);
  assert.match(source,/scenes:project\?\.referenceScenes/);
});
