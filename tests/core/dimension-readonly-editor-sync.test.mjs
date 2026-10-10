import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","dimension-grips-runtime.js"),"utf8");

test("question 209: read-only Dimension editor sync cannot re-enable value input",()=>{
  assert.match(runtime,/const sync=\(\)=>\{if\(stale\|\|locked\)return;/);
});
