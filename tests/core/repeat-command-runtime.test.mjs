import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","repeat-command-runtime.js"),"utf8");
const editing=fs.readFileSync(path.join(root,"src","ui","editing-ui.js"),"utf8");
const context=fs.readFileSync(path.join(root,"src","ui","object-selection-context-ui.js"),"utf8");
const build=fs.readFileSync(path.join(root,"scripts","build-standalone.mjs"),"utf8");

test("question 103: Repeat Commands runtime is valid classic JavaScript and bundled",()=>{
  assert.doesNotThrow(()=>new vm.Script(runtime,{filename:"repeat-command-runtime.js"}));
  assert.match(runtime,/TubeBenderRepeatCommands/);
  assert.match(build,/data-tubebender-bundled="repeat-command-runtime"/);
  assert.match(build,/__TB_REPEAT_COMMAND_MODULE_URL__/);
});

test("question 103: repeat stays idle-safe and supports question 104 remapped Enter Space",()=>{
  assert.match(runtime,/isTextTarget\(event\.target\)/);
  assert.match(runtime,/editingBusy\(\)/);
  assert.match(runtime,/hotkeys\.matchesCommand\(event,"repeatLast"\)/);
  assert.match(runtime,/hotkeys\.matchesCommand\(event,"repeatLastAlt"\)/);
  assert.match(runtime,/event\.key==="Enter"\|\|event\.key===" "/);
  assert.match(runtime,/event\.preventDefault\(\);event\.stopPropagation\(\);/);
  assert.match(runtime,/repeat\(\);/);
});

test("question 103: Recent Commands has separate persistent UI and bounded history",()=>{
  assert.match(runtime,/Recent Commands/);
  assert.match(runtime,/tbRecentCommandsPanel/);
  assert.match(runtime,/localStorage\.setItem\(STORAGE_KEY/);
  assert.match(runtime,/repeatByIndex/);
  assert.match(runtime,/clearRecent/);
});

test("question 103: Editing records successful commands and restores settings without point fields",()=>{
  assert.match(editing,/repeatApi=\(\)=>window\.TubeBenderRepeatCommands/);
  assert.match(editing,/function safeToolSettings/);
  assert.match(editing,/\(base\|target\|point\|pivot\|origin\|center/);
  assert.match(editing,/function runRepeatable/);
  assert.match(editing,/openWithSettings/);
  for(const id of ["copy","move","split","rotate","mirror","array","stack"])assert.match(editing,new RegExp('runRepeatable\\("'+id+'"'));
});

test("question 103: empty right-click menu exposes dynamic Repeat label",()=>{
  assert.match(context,/data-object-action="repeat-last"/);
  assert.match(context,/repeatApi\(\)\?\.repeatLast/);
  assert.match(context,/repeatApi\(\)\?\.hasLast/);
  assert.match(context,/repeatApi\(\)\.lastLabel\(\)/);
  assert.match(context,/hasSelection\|\|!hasRepeat/);
});

test("question 103: context Move and visibility actions enter the same recent history",()=>{
  assert.match(context,/record\?\.\("edit\.move","Move"/);
  assert.match(context,/record\?\.\("context\."\+action/);
  assert.match(runtime,/id:"context\.hide"/);
  assert.match(runtime,/id:"context\.show"/);
  assert.match(runtime,/id:"context\.isolate"/);
});
