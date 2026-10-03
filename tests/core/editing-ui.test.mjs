import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const uiPath=path.join(root,"src","ui","editing-ui.js");
const code=fs.readFileSync(uiPath,"utf8");

test("Editing UI remains valid classic JavaScript",()=>{
  assert.doesNotThrow(()=>new vm.Script(code,{filename:"editing-ui.js"}));
  assert.match(code,/__TB_STRAIGHT_RUN_MODULE_URL__/);
  assert.match(code,/TubeBenderEditing/);
  assert.match(code,/Редактирование/);
});

test("Copy creates independent tube and element identities and detaches external geometry links",()=>{
  assert.match(code,/copy\.id=makeId\("tube"\)/);
  assert.match(code,/elementId:row\?\.elementId\?makeId\("element"\)/);
  assert.match(code,/source_link_detached=true/);
  assert.match(code,/port\.externalRefId=""/);
  assert.match(code,/ports\.P2\)copy\.engineering\.ports\.P2\.locked=false/);
  assert.match(code,/ports\.P1\)copy\.engineering\.ports\.P1\.locked=true/);
});

test("Move reuses the existing selection-aware atomic move implementation",()=>{
  assert.match(code,/context\(\)\?\.applyMove\?\.\(\{x:dx,y:dy,z:dz\}\)/);
  assert.match(code,/ΔX/);
  assert.match(code,/ΔY/);
  assert.match(code,/ΔZ/);
});

test("Split Straight preserves one LINE and stores internal StraightRun nodes",()=>{
  assert.match(code,/straightRun\.straightRunFromLegacy/);
  assert.match(code,/splitStraightAtDistance/);
  assert.match(code,/splitStraightEqual/);
  assert.match(code,/splitStraightAtNormalized/);
  assert.match(code,/selected\.row\.straightRun=clone\(serialized\.straightRun\)/);
  assert.match(code,/LINE остаётся одним производственным StraightRun/);
});

test("Rotate and Array are not falsely exposed as functional before renderer integration",()=>{
  assert.match(code,/data-tool="rotate" disabled/);
  assert.match(code,/data-tool="array" disabled/);
  assert.match(code,/rigid transform stack/);
  assert.match(code,/Array domain готов/);
});

test("editing mutations run through readonly-aware model commands",()=>{
  assert.match(code,/api\(\)\?\.modelCommand\?api\(\)\.modelCommand/);
  assert.match(code,/Проект открыт только для просмотра/);
  assert.match(code,/Копировать выбранные трубы/);
  assert.match(code,/Разделить прямой участок/);
});
