import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtimePath=path.join(root,"src","ui","associative-mirror-runtime.js");
const code=fs.readFileSync(runtimePath,"utf8");

test("Associative Mirror runtime remains valid classic JavaScript",()=>{
  assert.doesNotThrow(()=>new vm.Script(code,{filename:"associative-mirror-runtime.js"}));
  assert.match(code,/__TB_RIGID_TRANSFORM_MODULE_URL__/);
  assert.match(code,/TubeBenderAssociativeMirrors/);
});

test("Associative Mirror keeps source and derived target identities separate",()=>{
  assert.match(code,/source_tube_id/);
  assert.match(code,/target_tube_id/);
  assert.match(code,/mirrorLegacyTubeRigid/);
  assert.match(code,/derived_readonly:true/);
  assert.match(code,/reflection_reencoded_right_handed:true/);
});

test("Associative Mirror synchronizes derived copies before renderAll",()=>{
  assert.match(code,/function synchronize\(p=project\(\)\)/);
  assert.match(code,/const original=renderAll/);
  assert.match(code,/renderAll=function\(\.\.\.args\)/);
  assert.match(code,/synchronize\(\)/);
  assert.match(code,/return original\.apply\(this,args\)/);
});

test("Associative Mirror exposes LostSource Break and Delete states",()=>{
  assert.match(code,/def\.status="LostSource"/);
  assert.match(code,/status:"LostSource"/);
  assert.match(code,/function breakMirror/);
  assert.match(code,/delete target\.mirror_member/);
  assert.match(code,/function deleteMirror/);
});

test("Mirror Original is explicit and rejects derived array or mirror members",()=>{
  assert.match(code,/function mirrorOriginal/);
  assert.match(code,/Derived Mirror member cannot be mirrored as Original/);
  assert.match(code,/Derived Array member cannot be mirrored as Original/);
  assert.match(code,/material_calculation_state/);
  assert.match(code,/equipment_calculation_state="Stale"/);
});
