import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","normalize-geometry-runtime.js"),"utf8");
const build=fs.readFileSync(path.join(root,"scripts","build-standalone.mjs"),"utf8");

test("question 88: Batch Normalize runtime is bundled through Normalize Geometry runtime",()=>{
  assert.doesNotThrow(()=>new vm.Script(runtime,{filename:"normalize-geometry-runtime.js"}));
  assert.match(runtime,/__TB_BATCH_NORMALIZE_MODULE_URL__/);
  assert.match(build,/batchNormalizeFittedDomainPath/);
  assert.match(build,/__TB_BATCH_NORMALIZE_MODULE_URL__/);
});

test("question 88: preview exists before mutation and exposes grouping selection nominal deviations",()=>{
  assert.match(runtime,/function buildBatchPreview\(/);
  assert.match(runtime,/buildBatchNormalizePreview/);
  assert.match(runtime,/Batch Normalize Preview/);
  assert.match(runtime,/data-batch-member/);
  assert.match(runtime,/data-batch-nominal/);
  assert.match(runtime,/out_of_tolerance/);
  assert.match(runtime,/tb-batch-row/);
  assert.match(runtime,/member\.out_of_tolerance\?'out':'\'/);
});

test("question 88: nested Fitted provenance is lifted only into temporary preview carrier",()=>{
  assert.match(runtime,/geometry:\{\.\.\.clone\(target\.object\),geometry_status:"Fitted"\}/);
  assert.doesNotMatch(runtime,/target\.object\.geometry_status="Fitted"/);
});

test("question 88: selected Batch application is one History command",()=>{
  const start=runtime.indexOf("function applyBatchPreview");
  const end=runtime.indexOf("function setBatchSelection",start);
  const block=runtime.slice(start,end);
  assert.match(block,/batchNormalizePlan/);
  assert.match(block,/command\("Batch Normalize Fitted → Exact",mutate\)/);
  assert.match(block,/for\(const item of plan\.items\)/);
  assert.match(block,/normalizeTarget\(target/);
  assert.equal((block.match(/modelCommand/g)??[]).length,1);
});

test("question 88: batch apply keeps original Fitted objects and creates Exact selections",()=>{
  assert.match(runtime,/project\(\)\.tubes\.push\(clone\(result\.exact_geometry\)\)/);
  assert.match(runtime,/created\.map\(item=>item\.kind==="tube"/);
  assert.match(runtime,/tubebender-batch-normalize/);
});
