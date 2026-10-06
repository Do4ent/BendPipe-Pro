import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","dimension-grips-runtime.js"),"utf8");

test("question 140: Dimension hover includes provenance sources",()=>{
  assert.match(runtime,/const sources=\[\.\.\.new Set\(\(dimension\?\.references\?\?\[\]\)\.map\(ref=>String\(ref\?\.object_id/);
  assert.match(runtime,/Source: /);
});

test("question 140: rebound Dimension hover includes audit count",()=>{
  assert.match(runtime,/const auditCount=Array\.isArray\(dimension\?\.rebound_history\)\?dimension\.rebound_history\.length:0/);
  assert.match(runtime,/Rebind audit: /);
});
