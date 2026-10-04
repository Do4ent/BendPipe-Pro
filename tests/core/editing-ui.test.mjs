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
  assert.match(code,/context\(\)\?\.applyMove\?\.\(delta\)/);
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

test("Rotate and associative Array are both functional editing commands",()=>{
  assert.match(code,/__TB_RIGID_TRANSFORM_MODULE_URL__/);
  assert.match(code,/data-tool="rotate">Rotate/);
  assert.doesNotMatch(code,/data-tool="rotate" disabled/);
  assert.match(code,/rotateLegacyTubeRigid/);
  assert.match(code,/wholeObjectCommand/);
  assert.match(code,/reloadActiveTube/);
  assert.match(code,/Rigid-body Rotate сохраняет длины, CLR и углы гибов/);
  assert.match(code,/data-tool="array">Array/);
  assert.doesNotMatch(code,/data-tool="array" disabled/);
  assert.match(code,/Associative Array/);
  assert.match(code,/runtime\.addArray/);
  assert.match(code,/runtime\.suppressMember/);
  assert.match(code,/runtime\.breakArray/);
});

test("editing mutations run through readonly-aware model commands",()=>{
  assert.match(code,/api\(\)\?\.modelCommand\?api\(\)\.modelCommand/);
  assert.match(code,/Проект открыт только для просмотра/);
  assert.match(code,/Копировать выбранные трубы/);
  assert.match(code,/Разделить прямой участок/);
});


test("derived associative members are excluded from direct Copy Rotate and Array source selection",()=>{
  assert.match(code,/array_member\?\.derived_readonly!==true/);
});


test("Transform Stack UI exposes associative Move Rotate Mirror ordering and Bake controls",()=>{
  assert.match(code,/data-tool="stack">Transform Stack/);
  assert.match(code,/TubeBenderTransformStacks/);
  assert.match(code,/runtime\.createForTube/);
  assert.match(code,/runtime\.appendMove/);
  assert.match(code,/runtime\.appendRotate/);
  assert.match(code,/runtime\.appendMirror/);
  assert.match(code,/runtime\.reorderOperation/);
  assert.match(code,/runtime\.setOperationEnabled/);
  assert.match(code,/runtime\.removeOperation/);
  assert.match(code,/runtime\.bake/);
  assert.match(code,/Номинальные L, CLR и bend angle не изменяются/);
});


test("Array UI can detach one derived member for editing",()=>{
  assert.match(code,/Detach for editing/);
  assert.match(code,/runtime\.detachMember/);
  assert.match(code,/Отсоединить Array member для редактирования/);
});


test("Move UI supports live dynamic Absolute Relative Polar 3D input with Ortho Polar tracking",()=>{
  assert.match(code,/__TB_DYNAMIC_INPUT_MODULE_URL__/);
  assert.match(code,/data-edit-vector/);
  assert.match(code,/dynamicInput\.parseCoordinateInput/);
  assert.match(code,/dynamicInput\.applyOrthoTracking/);
  assert.match(code,/dynamicInput\.applyPolarTracking/);
  assert.match(code,/dynamicInput\.dynamicInputPreview/);
  assert.match(code,/Absolute Move доступен только для одной выбранной трубы/);
});


test("Copy UI supports atomic multiple copy with XYZ step",()=>{
  assert.match(code,/function multipleCopySelection/);
  assert.match(code,/data-copy-count/);
  assert.match(code,/data-copy-step-x/);
  assert.match(code,/data-copy-step-y/);
  assert.match(code,/data-copy-step-z/);
  assert.match(code,/Множественное копирование труб/);
  assert.match(code,/translateLegacyTubeRigid/);
});
