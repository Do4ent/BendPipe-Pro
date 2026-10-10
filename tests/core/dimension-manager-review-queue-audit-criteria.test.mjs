import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 258: Review queue audit records reproducible queue criteria and ids",()=>{
  const fn=ui.match(/function reviewQueueDimensionAuditSnapshot\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/queue:\{/);
  assert.match(fn,/filter:"needs-review"/);
  assert.match(fn,/sort:"audit"/);
  assert.match(fn,/const dimensionIds=items\.map/);
  assert.match(fn,/dimension_ids:dimensionIds/);
});
