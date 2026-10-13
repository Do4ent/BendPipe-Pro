import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","selection-sets-runtime.js"),"utf8");
const context=fs.readFileSync(path.join(root,"src","ui","object-selection-context-ui.js"),"utf8");
const palette=fs.readFileSync(path.join(root,"src","ui","command-palette-runtime.js"),"utf8");
const build=fs.readFileSync(path.join(root,"scripts","build-standalone.mjs"),"utf8");

test("question 106: Selection Sets runtime is valid classic JavaScript and bundled",()=>{
  assert.doesNotThrow(()=>new vm.Script(runtime,{filename:"selection-sets-runtime.js"}));
  assert.match(runtime,/TubeBenderSelectionSets/);
  assert.match(build,/data-tubebender-bundled="selection-sets-runtime"/);
  assert.match(build,/__TB_SELECTION_SETS_MODULE_URL__/);
});

test("question 106: TreeView and panel support full named-set lifecycle",()=>{
  assert.match(runtime,/Наборы выбора/);
  assert.match(runtime,/data-selection-set/);
  assert.match(runtime,/Create from selection/);
  assert.match(runtime,/data-set-rename/);
  assert.match(runtime,/data-set-add/);
  assert.match(runtime,/data-set-remove/);
  assert.match(runtime,/data-set-delete/);
});

test("question 106: a set can restore selection and batch visibility lock operations",()=>{
  assert.match(runtime,/replaceSelectionKeys/);
  assert.match(runtime,/function showHide\(/);
  assert.match(runtime,/function lockSet\(/);
  assert.match(runtime,/setLockForRef/);
  assert.match(runtime,/data-set-show/);
  assert.match(runtime,/data-set-hide/);
  assert.match(runtime,/data-set-lock/);
  assert.match(runtime,/data-set-unlock/);
});

test("question 106: named set can feed Move Copy Rotate Array without hierarchy mutation",()=>{
  assert.match(runtime,/function useWith\(/);
  for(const tool of ["move","copy","rotate","array"])assert.match(runtime,new RegExp('data-set-tool="'+tool+'"'));
  assert.match(runtime,/TubeBenderEditing\?\.open/);
  assert.match(runtime,/Static Selection Set хранит только ссылки/);
});

test("question 106: Selection Sets are searchable dynamic Command Palette commands",()=>{
  assert.match(palette,/registerProvider/);
  assert.match(runtime,/registerProvider\?\.\(provider\)/);
  assert.match(runtime,/Selection Set: /);
  assert.match(runtime,/Набор выбора: /);
  assert.match(runtime,/run:\(\)=>selectSet\(set\.id\)/);
});

test("question 106: dimensions and construction have reusable selection keys",()=>{
  assert.match(context,/dimension:"dimension:"/);
  assert.match(context,/construction:"construction:"/);
  assert.match(context,/kind:"dimension"/);
  assert.match(context,/kind:"construction"/);
});

test("question 106: delete mutation prunes set membership inside same model command",()=>{
  const deleteBlock=context.slice(context.indexOf('}else if(action==="delete"){'),context.indexOf('selected.clear();',context.indexOf('}else if(action==="delete"){')));
  assert.match(deleteBlock,/deleteTubes\(entries\)/);
  assert.match(deleteBlock,/deleteMeshInstances\(entries\)/);
  assert.match(deleteBlock,/TubeBenderSelectionSets\?\.pruneMissing/);
});


test("question 107: runtime distinguishes Static and Dynamic Selection Sets",()=>{
  assert.match(runtime,/DynamicSelectionSet/);
  assert.match(runtime,/resolvedMembers/);
  assert.match(runtime,/evaluateDynamicSelectionSet/);
  assert.match(runtime,/data-set-type/);
  assert.match(runtime,/value="dynamic"/);
  assert.match(runtime,/dynamic":"static"/);
});

test("question 107: dynamic candidates cover current project object categories",()=>{
  assert.match(runtime,/function allProjectRefs\(/);
  for(const kind of ["tube","row","mesh-instance","group","project-assembly","dimension","construction","ref"]){
    assert.match(runtime,new RegExp('kind:"'+kind.replace("-","\\-")+'"'));
  }
  assert.match(runtime,/function descriptorForRef\(/);
  assert.match(runtime,/layer_id/);
  assert.match(runtime,/material_profile_id/);
  assert.match(runtime,/group_ids/);
  assert.match(runtime,/assembly_ids/);
});

test("question 107: Select Show Hide Lock and tools resolve dynamic membership at execution time",()=>{
  assert.match(runtime,/const members=resolvedMembers\(set\)/);
  assert.match(runtime,/members\.map\(selectionKey\)/);
  assert.match(runtime,/for\(const ref of members\)setVisibleForRef/);
  assert.match(runtime,/for\(const ref of members\)setLockForRef/);
  assert.match(runtime,/if\(!selectSet\(setId\)\)return false/);
});

test("question 107: Dynamic rules are editable while manual Add Remove stay static-only",()=>{
  assert.match(runtime,/data-set-rules/);
  assert.match(runtime,/data-set-save-rules/);
  assert.match(runtime,/updateDynamicSelectionSetRules/);
  assert.match(runtime,/!set\|\|dynamic\?"disabled":""/);
  assert.match(runtime,/Dynamic Selection Set хранит правила и автоматически пересчитывает состав/);
});
