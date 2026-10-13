import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

test("source-link command wrapper bumps revision before redrawing",()=>{
  const source=fs.readFileSync(new URL("../../src/import/dwfx/reference-scene-ui.js",import.meta.url),"utf8");
  const window={};
  vm.runInNewContext(source,{window,setTimeout,clearTimeout,globalThis:{}});
  const ui=window.TubeBenderReferenceSceneUi;
  const origin=ui.revisionSnapshot();
  assert.equal(typeof ui.markSceneChanged,"function");
  assert.ok(source.includes("markSceneChanged(null,revisionKind)"));
  assert.ok(source.includes('callbacks,"display"'));
  assert.ok(source.includes('callbacks,"geometry"'));
  assert.ok(source.indexOf('markSceneChanged(null,')<source.indexOf('    save?.();',source.indexOf('function runSourceLinkCommand')));
  ui.markSceneChanged(null,"display");
  assert.equal(ui.revisionSnapshot().display,origin.display+1);
  ui.markSceneChanged(null,"geometry");
  assert.equal(ui.revisionSnapshot().geometry,origin.geometry+1);
});
