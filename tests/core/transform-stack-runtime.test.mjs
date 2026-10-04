import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtimePath=path.join(root,"src","ui","transform-stack-runtime.js");
const code=fs.readFileSync(runtimePath,"utf8");

test("Transform Stack runtime remains valid classic JavaScript",()=>{
  assert.doesNotThrow(()=>new vm.Script(code,{filename:"transform-stack-runtime.js"}));
  assert.match(code,/__TB_TRANSFORM_STACK_MODULE_URL__/);
  assert.match(code,/TubeBenderTransformStacks/);
  assert.match(code,/associative_transform_stacks/);
});

test("Transform Stack runtime exposes associative stack lifecycle",()=>{
  assert.match(code,/createForTube/);
  assert.match(code,/appendMove/);
  assert.match(code,/appendRotate/);
  assert.match(code,/appendMirror/);
  assert.match(code,/removeOperation/);
  assert.match(code,/reorderOperation/);
  assert.match(code,/setOperationEnabled/);
  assert.match(code,/bake/);
  assert.match(code,/deleteStack/);
});

test("Transform Stack runtime evaluates before render and keeps stacked tubes readonly",()=>{
  assert.match(code,/applyTubeTransformStack/);
  assert.match(code,/renderAll\._tbTransformStacks/);
  assert.match(code,/derived_readonly:true/);
  assert.match(code,/transform_stack_member/);
});

test("Bake removes association while preserving stable tube identity",()=>{
  assert.match(code,/bakeTubeTransformStack/);
  assert.match(code,/baked\.id=tube\.id/);
  assert.match(code,/baked\.name=tube\.name/);
  assert.match(code,/defs\.splice\(index,1\)/);
});


test("question 68: tube Transform Stack exposes no Scale operation",()=>{
  assert.doesNotMatch(code,/data-stack-add="scale"/i);
  assert.doesNotMatch(code,/kind:"Scale"/);
  assert.match(code,/data-stack-add="move"/);
  assert.match(code,/data-stack-add="rotate"/);
  assert.match(code,/data-stack-add="mirror"/);
});
