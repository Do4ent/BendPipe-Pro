import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 523: audit download preflight unifies runtime and payload validation",()=>{
  const fn=ui.match(/function dimensionAuditDownloadPreflight\(filename,snapshot\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/schema:"TubeBender\.DimensionAuditDownloadPreflight\.v1"/);
  assert.match(fn,/const runtimeValidation=dimensionAuditDownloadRuntimeValidation\(\)/);
  assert.match(fn,/const validation=dimensionAuditDownloadValidation\(filename,snapshot\)/);
  assert.match(fn,/runtime_validation:runtimeValidation/);
});
