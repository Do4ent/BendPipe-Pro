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


test("question 53: Move Copy Rotate consume Object Snap Tracking candidates",()=>{
  assert.match(code,/TubeBenderSnapTracking/);
  assert.match(code,/data-copy-base-snap/);
  assert.match(code,/data-copy-target-snap/);
  assert.match(code,/data-move-use-snap/);
  assert.match(code,/data-rotate-use-snap/);
  assert.match(code,/Snap → Base/);
  assert.match(code,/Snap → Target/);
  assert.match(code,/Snap → Point/);
  assert.match(code,/Snap → Pivot/);
  assert.match(code,/setTrackingModes/);
  assert.match(code,/finishSnapCommand/);
});


test("question 56: Copy supports Single and Multiple base-target sessions with atomic commit",()=>{
  assert.match(code,/data-copy-mode/);
  assert.match(code,/Одна копия/);
  assert.match(code,/Несколько копий/);
  assert.match(code,/function setCopyBase\(/);
  assert.match(code,/function addCopyTarget\(/);
  assert.match(code,/function commitCopySeries\(/);
  assert.match(code,/Base Point → Target Point/);
  assert.match(code,/modelCommand\?api\(\)\.modelCommand/);
  assert.match(code,/Copy: серия целевых точек/);
  assert.match(code,/event\.key==="Enter"/);
  assert.match(code,/event\.key==="Backspace"/);
});

test("question 56: Copy live preview is helper geometry and never mutates the project",()=>{
  assert.match(code,/function renderCopyPreview\(\)/);
  assert.match(code,/copyLivePreview:true/);
  assert.match(code,/objectSelectionHelper:true/);
  assert.match(code,/next\.opacity=\.32/);
  assert.match(code,/placement\.position\.set\(delta\.x\*scale,delta\.y\*scale,delta\.z\*scale\)/);
  assert.match(code,/tubebender-snap-change/);
  assert.match(code,/pendingPoint/);
});

test("question 56: exact target coordinates and polar input reuse Dynamic Input",()=>{
  assert.match(code,/data-copy-base-input/);
  assert.match(code,/data-copy-target-input/);
  assert.match(code,/dynamicInput\.parseCoordinateInput\(raw,\{origin:copySession\.base,decimal_separator:decimalPreference\(\)\}\)/);
  assert.match(code,/@100<45/);
});


test("question 58: Editing UI persists and applies preferred decimal separator",()=>{
  assert.match(code,/DECIMAL_PREF_KEY="tubebender\.dynamicInput\.decimalSeparator"/);
  assert.match(code,/data-decimal-pref/);
  assert.match(code,/<option value="auto">Auto<\/option>/);
  assert.match(code,/localStorage\.setItem\(DECIMAL_PREF_KEY,next\)/);
  assert.match(code,/decimal_separator:decimalPreference\(\)/);
  assert.match(code,/formatNumericInput/);
  assert.match(code,/12\.5 и 12,5/);
  assert.match(code,/точкой с запятой \(;\)/);
});
