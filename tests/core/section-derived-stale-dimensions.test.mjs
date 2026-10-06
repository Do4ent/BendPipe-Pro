import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const dimensions=fs.readFileSync(path.join(root,"src","domain","measurements","dimensions.mjs"),"utf8");
const section=fs.readFileSync(path.join(root,"src","ui","section-view-runtime.js"),"utf8");
const measurements=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 113: persistent dimension references keep Section-derived snapshot provenance",()=>{
  assert.match(dimensions,/section_snapshot:clone\(ref\.section_snapshot\?\?null\)/);
});

test("question 113: changing Section View invalidates virtual selection registry",()=>{
  assert.match(section,/function invalidateDerivedSelections\(\)/);
  assert.match(section,/derivedSelectionRegistry\.clear\(\)/);
  assert.match(section,/parseSelectionKey\?\.\(key\)\?\.kind!=="section-derived"/);
  assert.match(section,/replaceSelectionKeys\?\.\(kept,\{announce:true\}\)/);
});

test("question 113: saved Section-derived dimensions become Stale on Section View changes",()=>{
  assert.match(measurements,/function isSectionDerivedDimension\(dimension\)/);
  assert.match(measurements,/function invalidateSectionDerivedDimensions\(reason="Section View changed"\)/);
  assert.match(measurements,/status:"Stale"/);
  assert.match(measurements,/stale_reason:dimension\?\.stale_reason\?\?String\(reason\)/);
  assert.match(measurements,/tubebender-section-view-change/);
  assert.match(measurements,/section-derived-stale/);
});
