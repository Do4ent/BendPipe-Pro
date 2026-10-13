import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 520: audit download fails closed on invalid runtime protocol",()=>{
  const fn=ui.match(/function downloadDimensionAuditJson\(filename,snapshot\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const preflight=dimensionAuditDownloadPreflight\(filename,snapshot\)/);
  assert.match(fn,/if\(!preflight\.runtime_validation\.valid\)\{/);
  assert.match(fn,/toast\("Dimension audit download protocol invalid"\)/);
  assert.match(fn,/return false/);
});
