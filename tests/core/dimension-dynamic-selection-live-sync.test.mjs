import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","selection-sets-runtime.js"),"utf8");

test("question 132: Dynamic Dimension Selection Sets refresh on Dimension changes",()=>{
  assert.match(runtime,/tubebender-dimension-change/);
  assert.match(runtime,/renderTree\(\);if\(panel\?\.classList\.contains\("open"\)\)renderPanel\(\)/);
});
