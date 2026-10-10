import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 150: Saved Dimensions can sort by project order or audit priority",()=>{
  assert.match(ui,/dimensionManagerSort="project"/);
  assert.match(ui,/dimensionManagerSort!=="audit"/);
  assert.match(ui,/data-dimension-sort="project"/);
  assert.match(ui,/data-dimension-sort="audit"/);
});

test("question 150: audit priority keeps a stable explicit rank",()=>{
  assert.match(ui,/const rank=dimension=>String\(dimension\?\.status\?\?""\)==="Stale"/);
  assert.match(ui,/rank\(a\.dimension\)-rank\(b\.dimension\)\|\|a\.index-b\.index/);
});

test("question 176: audit priority orders Stale, Needs review, Rebound, then remaining items",()=>{
  assert.match(ui,/\?0\s*\n\s*:dimensionAuditNeedsReview\(dimension\)\?1\s*\n\s*:dimension\?\.rebound_from_stale===true\?2:3/);
});
