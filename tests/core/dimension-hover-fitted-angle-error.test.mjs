import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","dimension-grips-runtime.js"),"utf8");

test("question 186: 3D Fitted audit hover shows angular fit error",()=>{
  assert.match(runtime,/fittedStats\.max_error_deg/);
  assert.match(runtime,/max angle error: /);
});
