import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const properties=fs.readFileSync(path.join(root,"src","ui","properties-panel-runtime.js"),"utf8");

test("question 179: Dimension Properties exposes reference-level trusted geometry evidence",()=>{
  assert.match(properties,/geometry_status:ref\?\.geometry_status/);
  assert.match(properties,/fitting_error:ref\?\.fitting_error\?\?null/);
  assert.match(properties,/confidence:ref\?\.confidence\?\?null/);
  assert.match(properties,/evidence:ref\?\.evidence\?\?null/);
  assert.match(properties,/section_snapshot:ref\?\.section_snapshot\?\?null/);
});
