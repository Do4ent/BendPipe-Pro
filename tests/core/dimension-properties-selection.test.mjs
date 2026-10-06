import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const grips=fs.readFileSync(path.join(root,"src","ui","dimension-grips-runtime.js"),"utf8");
const props=fs.readFileSync(path.join(root,"src","ui","properties-panel-runtime.js"),"utf8");

test("question 119: selecting a 3D dimension synchronizes Object Context selection",()=>{
  assert.match(grips,/const key="dimension:"\+encodeURIComponent\(String\(id\)\)/);
  assert.match(grips,/TubeBenderObjectContext\?\.replaceSelectionKeys\?\.\(\[key\],\{announce:true\}\)/);
});

test("question 119: Properties describes dimension engineering and stale state",()=>{
  assert.match(props,/if\(entry\.kind==="dimension"\)/);
  assert.match(props,/\["Status",dimension\?\.status\]/);
  assert.match(props,/\["Stale reason",dimension\?\.stale_reason\]/);
  assert.match(props,/\["References",refs\]/);
});

test("question 119: Properties exposes rebind audit history",()=>{
  assert.match(props,/Rebind audit/);
  assert.match(props,/Rebound from stale/);
  assert.match(props,/Rebind history/);
});
