import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","dimension-grips-runtime.js"),"utf8");

test("question 195: 3D Dimension hover shows reference provenance counts",()=>{
  assert.match(runtime,/dimensionReferenceStatusCounts\?\.\(dimension\)/);
  assert.match(runtime,/Refs: /);
  assert.match(runtime,/Object\.entries\(referenceCounts\)/);
});
