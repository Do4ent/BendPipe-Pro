import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 369: review progress UI fallback orders review items deterministically",()=>{
  const fn=ui.match(/function dimensionReviewProgressItems\(items=savedDimensions\(\)\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/\.slice\(\)\.sort\(\(a,b\)=>String\(a\?\.id\?\?""\)\.localeCompare\(String\(b\?\.id\?\?""\)\)\)/);
});
