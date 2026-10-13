import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","dimension-grips-runtime.js"),"utf8");

test("question 212: selectDimension rejects missing or hidden Dimensions",()=>{
  assert.match(runtime,/const dimension=dimensionById\(id\)/);
  assert.match(runtime,/if\(!dimension\|\|dimension\.visible===false\)/);
  assert.match(runtime,/rebuild\(\);return null/);
  assert.match(runtime,/activeId=String\(dimension\.id\)/);
  assert.match(runtime,/replaceSelectionKeys\?\.\(\[key\],\{announce:true\}\)/);
});
