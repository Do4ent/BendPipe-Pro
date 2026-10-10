import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 473: visible audit export preserves review context view and summary",()=>{
  const fn=ui.match(/function visibleDimensionAuditSnapshot\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/filter:dimensionManagerFilter/);
  assert.match(fn,/sort:dimensionManagerSort/);
  assert.match(fn,/search:String\(dimensionManagerSearch\?\?""\)/);
  assert.match(fn,/\.\.\.dimensionAuditReviewBundle\(items\)/);
});
