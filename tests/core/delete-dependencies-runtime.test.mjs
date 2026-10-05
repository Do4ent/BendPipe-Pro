import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","delete-dependencies-runtime.js"),"utf8");
const selection=fs.readFileSync(path.join(root,"src","ui","object-selection-context-ui.js"),"utf8");
const build=fs.readFileSync(path.join(root,"scripts","build-standalone.mjs"),"utf8");

test("question 93: safe-delete runtime is valid classic JavaScript and bundled",()=>{
  assert.doesNotThrow(()=>new vm.Script(runtime,{filename:"delete-dependencies-runtime.js"}));
  assert.match(runtime,/TubeBenderDeleteDependencies/);
  assert.match(build,/data-tubebender-bundled="delete-dependencies-runtime"/);
  assert.match(build,/bundledDeleteDependenciesRuntime: true/);
});

test("question 93: dialog is fail-closed and exposes explicit strategies",()=>{
  assert.match(runtime,/Безопасное удаление · Dependencies/);
  assert.match(runtime,/<option value="">— выберите —<\/option>/);
  assert.match(runtime,/value="Detach"/);
  assert.match(runtime,/value="Cascade"/);
  assert.match(runtime,/value="Reassign"/);
  assert.match(runtime,/cancelled:true,strategy:"Cancel"/);
});

test("question 93: Reassign requires explicit target selection",()=>{
  assert.match(runtime,/data-deldep-replacement/);
  assert.match(runtime,/Для Reassign выберите новый объект/);
  assert.match(runtime,/replacement_by_target/);
});

test("question 93: actual Delete is blocked until dependency resolution completes",()=>{
  assert.match(selection,/function deleteDependencyApi\(\)/);
  assert.match(selection,/action==="delete"&&!dependencyResolved/);
  assert.match(selection,/api\.request\(entries,\(resolution\)=>/);
  assert.match(selection,/applyAction\("delete",\{dependencyResolved:true,dependencyResolution:resolution\}\)/);
  assert.match(selection,/анализ зависимостей недоступен/);
});

test("question 93: dependency strategy and object deletion share one model mutation",()=>{
  const start=selection.indexOf('}else if(action==="delete"){');
  const block=selection.slice(start,start+3800);
  assert.match(block,/applyStrategy\?\.\(p,dependencyResolution\)/);
  assert.match(block,/deleteTubes\(entries\)/);
  assert.match(block,/deleteMeshInstances\(entries\)/);
  assert.match(selection,/tbModelCommand\(label,mutate\)/);
});

test("question 93: row deletion is not misinterpreted as whole-tube dependency deletion",()=>{
  assert.match(runtime,/if\(entry\.kind==="tube"\)return \{kind:"tube"/);
  assert.doesNotMatch(runtime,/\["tube","row","origin","end"\]\.includes/);
});
