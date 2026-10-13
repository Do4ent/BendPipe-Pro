import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","dimension-grips-runtime.js"),"utf8");

test("question 139: Dimension hover text includes status and stale reason",()=>{
  assert.match(runtime,/function dimensionHoverText\(dimension\)/);
  assert.match(runtime,/const status=String\(dimension\?\.status\?\?"NeedsUpdate"\)/);
  assert.match(runtime,/dimension\?\.stale_reason/);
});

test("question 139: 3D Dimension hover uses the existing Dimension picker",()=>{
  assert.match(runtime,/const picked=pick\(event\),dimension=dimensionById\(picked\?\.data\?\.dimensionId\)/);
  assert.match(runtime,/node\.textContent=dimensionHoverText\(dimension\)/);
  assert.match(runtime,/tbDimensionHover/);
});

test("question 139: hover helper is exposed without changing selection semantics",()=>{
  assert.match(runtime,/dimensionLabelText,dimensionHoverText,openEditor/);
});
