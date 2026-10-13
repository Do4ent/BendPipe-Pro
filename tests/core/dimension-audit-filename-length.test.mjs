import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 243: audit filename parts are length-bounded",()=>{
  const fn=ui.match(/function dimensionAuditFilenamePart\(value,fallback="item",maxLength=DIMENSION_AUDIT_FILENAME_POLICY\.part_default_length\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/DIMENSION_AUDIT_FILENAME_POLICY\.part_min_length/);
  assert.match(fn,/DIMENSION_AUDIT_FILENAME_POLICY\.part_max_length/);
  assert.match(fn,/DIMENSION_AUDIT_FILENAME_POLICY\.part_default_length/);
  assert.match(fn,/const clipped=safe\.slice\(0,limit\)/);
  assert.match(fn,/return clipped\|\|String\(fallback\)\.slice\(0,limit\)/);
});
