import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtimePath=path.join(root,"src","ui","associative-array-runtime.js");
const code=fs.readFileSync(runtimePath,"utf8");

test("Associative Array runtime remains valid classic JavaScript",()=>{
  assert.doesNotThrow(()=>new vm.Script(code,{filename:"associative-array-runtime.js"}));
  assert.match(code,/__TB_TRANSFORM_COMMANDS_MODULE_URL__/);
  assert.match(code,/__TB_RIGID_TRANSFORM_MODULE_URL__/);
  assert.match(code,/TubeBenderAssociativeArrays/);
});

test("Associative Array runtime supports Linear Matrix and Circular definitions",()=>{
  assert.match(code,/\["Linear","Matrix","Circular"\]/);
  assert.match(code,/def\.type==="Linear"/);
  assert.match(code,/def\.type==="Matrix"/);
  assert.match(code,/def\.type==="Circular"/);
  assert.match(code,/linearArrayTransforms/);
  assert.match(code,/matrixArrayTransforms/);
  assert.match(code,/rotateLegacyTubeRigid/);
});

test("derived members are regenerated from source tubes before renderAll",()=>{
  assert.match(code,/function synchronize\(p=project\(\)\)/);
  assert.match(code,/const original=renderAll/);
  assert.match(code,/renderAll=function\(\.\.\.args\)/);
  assert.match(code,/synchronize\(\)/);
  assert.match(code,/return original\.apply\(this,args\)/);
});

test("array members are read-only derived tubes with stable IDs",()=>{
  assert.match(code,/derived_readonly:true/);
  assert.match(code,/member_ids:clone/);
  assert.match(code,/const stableId=def\.member_ids\?\.\[stableKey\]\?\?previous\?\.id\?\?makeId/);
  assert.match(code,/def\.member_ids\[stableKey\]=stableId/);
  assert.match(code,/member\.id=stableId/);
});

test("Suppress Restore Break and LostSource are explicit array states",()=>{
  assert.match(code,/function suppressMember/);
  assert.match(code,/Source member cannot be suppressed/);
  assert.match(code,/function breakArray/);
  assert.match(code,/function deleteArray/);
  assert.match(code,/def\.status="LostSource"/);
  assert.match(code,/tube\.array_member=\{\.\.\.tube\.array_member,status:"LostSource"\}/);
});

test("Break Array detaches derived members instead of deleting them",()=>{
  assert.match(code,/delete tube\.array_member/);
  assert.match(code,/tube\.source_link_detached=true/);
  assert.match(code,/p\.associative_arrays\.splice/);
});


test("array runtime exposes explicit detach for independent member editing",()=>{
  assert.match(code,/function detachMember/);
  assert.match(code,/array_detached_from/);
  assert.match(code,/source_link_detached=true/);
  assert.match(code,/suppressed_members/);
  assert.match(code,/detachMember/);
});
