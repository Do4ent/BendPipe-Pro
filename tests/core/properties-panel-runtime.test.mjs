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
