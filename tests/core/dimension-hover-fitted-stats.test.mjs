import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","dimension-grips-runtime.js"),"utf8");

test("question 185: 3D Dimension audit hover shows Fitted quality statistics",()=>{
  assert.match(runtime,/dimensionFittedAuditStats\?\.\(dimension\)/);
  assert.match(runtime,/Fitted refs: /);
  assert.match(runtime,/max error: /);
  assert.match(runtime,/min confidence: /);
});
