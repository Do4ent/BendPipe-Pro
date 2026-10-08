import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 482: Dimension audit download API rejects unsafe filenames",()=>{
  const fn=ui.match(/function downloadDimensionAuditJson\(filename,snapshot\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const safeFilename=String\(filename\?\?""\)\.trim\(\)/);
  assert.match(fn,/safeFilename\.length>DIMENSION_AUDIT_FILENAME_POLICY\.json_max_length/);
  assert.match(fn,/!safeFilename\.endsWith\("\.json"\)/);
  assert.match(fn,/\[\\\\\/\\u0000-\\u001f\]/);
  assert.match(fn,/link\.download=safeFilename/);
  assert.match(fn,/return false/);
});
