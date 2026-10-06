import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","dimension-grips-runtime.js"),"utf8");

test("question 125: active Dimension follows global Object Context selection",()=>{
  assert.match(runtime,/function syncActiveDimensionFromSelection\(\)/);
  assert.match(runtime,/TubeBenderObjectContext\?\.selectionEntries/);
  assert.match(runtime,/entries\.length===1&&dimensionsOnly\.length===1/);
});

test("question 125: selecting a non-Dimension clears stale active grips",()=>{
  assert.match(runtime,/activeId=next;rebuild\(\);return true/);
  assert.match(runtime,/tubebender-selection-change",syncActiveDimensionFromSelection/);
});

test("question 125: synchronization helper is exposed for integration",()=>{
  assert.match(runtime,/setDimensionVisible,syncActiveDimensionFromSelection,activeDimension/);
});
