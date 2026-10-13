import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","selection-sets-runtime.js"),"utf8");

test("question 131: Dynamic Selection Set descriptors expose Dimension engineering fields",()=>{
  assert.match(runtime,/entry\.dimension_kind=String\(object\?\.kind\?\?""\)/);
  assert.match(runtime,/entry\.dimension_mode=String\(object\?\.mode\?\?"Reference"\)/);
  assert.match(runtime,/entry\.dimension_status=String\(object\?\.status\?\?"NeedsUpdate"\)/);
  assert.match(runtime,/entry\.reference_count=Array\.isArray\(object\?\.references\)/);
});

test("question 131: Dynamic Selection Sets can distinguish stale Section-derived dimensions",()=>{
  assert.match(runtime,/entry\.section_derived=\(object\?\.references\?\?\[\]\)\.some/);
  assert.match(runtime,/geometry_status==="SectionDerived"/);
  assert.match(runtime,/entry\.stale=String\(object\?\.status\?\?""\)==="Stale"/);
});
