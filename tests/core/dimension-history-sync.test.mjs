import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const build=fs.readFileSync(path.join(root,"scripts","build-standalone.mjs"),"utf8");
const props=fs.readFileSync(path.join(root,"src","ui","properties-panel-runtime.js"),"utf8");
const measurements=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");
const grips=fs.readFileSync(path.join(root,"src","ui","dimension-grips-runtime.js"),"utf8");
const sets=fs.readFileSync(path.join(root,"src","ui","selection-sets-runtime.js"),"utf8");

test("question 129: History publishes a central model restore/update event",()=>{
  assert.match(build,/tubebender-history-change/);
  assert.match(build,/undo:tbHistory\.undo\.length,redo:tbHistory\.redo\.length/);
});

test("question 129: Dimension UI surfaces refresh after Undo Redo or History jump",()=>{
  assert.match(props,/tubebender-history-change/);
  assert.match(measurements,/tubebender-history-change/);
  assert.match(grips,/tubebender-history-change/);
});

test("question 129: Selection Sets refresh after History restores membership",()=>{
  assert.match(sets,/tubebender-history-change/);
  assert.match(sets,/renderTree\(\);if\(panel\?\.classList\.contains\("open"\)\)renderPanel\(\)/);
});
