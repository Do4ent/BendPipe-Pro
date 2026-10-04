import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","properties-panel-runtime.js"),"utf8");
const build=fs.readFileSync(path.join(root,"scripts","build-standalone.mjs"),"utf8");

test("question 69: universal Properties panel runtime is valid classic JavaScript",()=>{
  assert.doesNotThrow(()=>new vm.Script(runtime,{filename:"properties-panel-runtime.js"}));
  assert.match(runtime,/TubeBenderProperties/);
  assert.match(runtime,/tbPropertiesPanel/);
  assert.match(runtime,/tubebender-selection-change/);
  assert.match(build,/data-tubebender-bundled="properties-panel-runtime"/);
  assert.match(build,/bundledPropertiesPanel: true/);
});

test("question 69: Properties panel handles every current selection object kind",()=>{
  for(const kind of ["tube","row","origin","end","assembly","assembly-part","ref","mesh-instance"]){
    assert.match(runtime,new RegExp(kind.replace("-","\\-")));
  }
  assert.match(runtime,/Source \/ Reference/);
  assert.match(runtime,/Editable Mesh Instance/);
  assert.match(runtime,/Родительская труба/);
});

test("question 69: Properties panel is one read-only inspector rather than separate object dialogs",()=>{
  assert.match(runtime,/function describe\(entry\)/);
  assert.match(runtime,/function snapshot\(\)/);
  assert.match(runtime,/function cardHtml\(item\)/);
  assert.doesNotMatch(runtime,/contenteditable/i);
  assert.doesNotMatch(runtime,/data-prop-edit/i);
});

test("question 69: tree and 3D selection refresh the same Properties panel",()=>{
  assert.match(runtime,/const entries=\(\)=>ctx\(\)\?\.selectionEntries/);
  assert.match(runtime,/window\.addEventListener\("tubebender-selection-change"/);
  assert.match(runtime,/Выберите объект в 3D или TreeView/);
});


test("question 70: Properties panel computes shared editable fields for multi-selection",()=>{
  assert.match(runtime,/function editableTarget\(entry\)/);
  assert.match(runtime,/function editableTargets\(\)/);
  assert.match(runtime,/function commonEditableFields\(\)/);
  assert.match(runtime,/targets\.every\(target=>!!target\.fields\[name\]\)/);
  assert.match(runtime,/mixed=values\.some\(value=>value!==first\)/);
  assert.match(runtime,/— разные значения —/);
});

test("question 70: multi-edit applies one common property through one atomic model command",()=>{
  assert.match(runtime,/function applyCommonProperty\(fieldName,input\)/);
  assert.match(runtime,/for\(const target of targets\)target\.fields\[fieldName\]\.set\(next\)/);
  assert.match(runtime,/const command=eng\(\)\?\.modelCommand/);
  assert.match(runtime,/Изменение применяется ко всем совместимым выбранным объектам одной операцией Undo/);
});

test("question 70: Source and geometry rows remain protected from unsafe generic property edits",()=>{
  const editableBlock=runtime.slice(runtime.indexOf("function editableTarget"),runtime.indexOf("function commonTubeProps"));
  assert.match(editableBlock,/entry\.kind==="tube"/);
  assert.match(editableBlock,/entry\.kind==="mesh-instance"/);
  assert.doesNotMatch(editableBlock,/entry\.kind==="ref"/);
  assert.doesNotMatch(editableBlock,/entry\.kind==="row"/);
});

test("question 70: boolean mixed values use indeterminate state before user chooses a value",()=>{
  assert.match(runtime,/data-property-mixed/);
  assert.match(runtime,/input\.indeterminate=input\.dataset\.propertyMixed==="1"/);
  assert.match(runtime,/input\.indeterminate=false/);
});
