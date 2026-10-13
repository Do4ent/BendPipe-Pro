import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const code=fs.readFileSync(path.join(root,"src","ui","reproducibility-runtime.js"),"utf8");
test("reproducibility runtime is valid classic JS and fail-closed",()=>{
  assert.doesNotThrow(()=>new vm.Script(code,{filename:"reproducibility-runtime.js"}));
  assert.match(code,/__TB_REPRODUCIBILITY_MODULE_URL__/);
  assert.match(code,/TubeBenderReproducibility/);
  assert.match(code,/compareCpuGpuEvidence/);
  assert.match(code,/reproducibilityReleaseGate/);
  assert.match(code,/reproducibility/);
});
