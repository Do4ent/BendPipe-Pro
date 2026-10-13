import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","dimension-grips-runtime.js"),"utf8");

test("question 210: read-only Dimension grip click selects without dragging",()=>{
  assert.match(runtime,/if\(readonly\(\)\)\{/);
  assert.match(runtime,/const id=String\(picked\?\.data\?\.dimensionId\?\?""\)/);
  assert.match(runtime,/if\(id\)selectDimension\(id\)/);
  assert.match(runtime,/event\?\.preventDefault\?\.\(\)/);
  assert.match(runtime,/return false/);
});
