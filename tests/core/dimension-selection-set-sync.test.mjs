import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","selection-sets-runtime.js"),"utf8");

test("question 127: Selection Set visibility collects Dimension members",()=>{
  assert.match(runtime,/members\.filter\(ref=>ref\.kind==="dimension"\)/);
});

test("question 127: Dimension visibility through Selection Sets dispatches Dimension change",()=>{
  assert.match(runtime,/tubebender-dimension-change/);
  assert.match(runtime,/selection-set-show/);
  assert.match(runtime,/selection-set-hide/);
  assert.match(runtime,/dimension_ids:dimensionIds/);
});
