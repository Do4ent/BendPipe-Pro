import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","command-palette-runtime.js"),"utf8");
const editing=fs.readFileSync(path.join(root,"src","ui","editing-ui.js"),"utf8");
const grips=fs.readFileSync(path.join(root,"src","ui","geometry-grips-runtime.js"),"utf8");
const build=fs.readFileSync(path.join(root,"scripts","build-standalone.mjs"),"utf8");

test("question 105: Command Line runtime is valid classic JavaScript and bundled",()=>{
  assert.doesNotThrow(()=>new vm.Script(runtime,{filename:"command-palette-runtime.js"}));
  assert.match(runtime,/TubeBenderCommandLine/);
  assert.match(build,/data-tubebender-bundled="command-palette-runtime"/);
  assert.match(build,/__TB_COMMAND_PALETTE_MODULE_URL__/);
});

test("question 105: palette searches and launches with arrows Enter and history",()=>{
  assert.match(runtime,/searchCommands/);
  assert.match(runtime,/resolveCommand/);
  assert.match(runtime,/event\.key==="ArrowDown"/);
  assert.match(runtime,/event\.key==="ArrowUp"/);
  assert.match(runtime,/historyMove\(-1\)/);
  assert.match(runtime,/historyMove\(1\)/);
  assert.match(runtime,/event\.key==="Enter"/);
  assert.match(runtime,/executeCommand/);
});

test("question 105: aliases are editable from separate UI with conflict validation",()=>{
  assert.match(runtime,/Command aliases/);
  assert.match(runtime,/data-alias-id/);
  assert.match(runtime,/normalizeAliasMap\(next\)/);
  assert.match(runtime,/Command aliases сохранены/);
});

test("question 105: command execution reuses Hotkeys and Repeat runtimes",()=>{
  assert.match(runtime,/TubeBenderHotkeys\?\.execute/);
  assert.match(runtime,/TubeBenderRepeatCommands\?\.repeatLast/);
  assert.match(runtime,/TubeBenderRepeatCommands\?\.openRecent/);
  assert.match(runtime,/TubeBenderHotkeys\?\.openSettings/);
});

test("question 105: current operation step and numeric input are exposed",()=>{
  assert.match(runtime,/function setStep\(/);
  assert.match(runtime,/activeStep/);
  assert.match(runtime,/numeric_value:numeric/);
  assert.match(runtime,/tubebender-command-line-input/);
  assert.match(runtime,/currentStep:/);
});

test("question 105: Editing consumes Command Line numeric input for active steps",()=>{
  assert.match(editing,/TubeBenderCommandLine\?\.setStep/);
  assert.match(editing,/tubebender-command-line-input/);
  assert.match(editing,/activeTool==="rotate"/);
  assert.match(editing,/activeTool==="split"/);
  assert.match(editing,/activeTool==="move"/);
  assert.match(editing,/activeTool==="array"/);
});

test("question 105: Length and Angle consume numeric Command Line values through Geometry Grips",()=>{
  assert.match(grips,/tubebender-command-line-input/);
  assert.match(grips,/detail\.command_id==="length"/);
  assert.match(grips,/detail\.command_id==="angle"/);
  assert.match(grips,/applyExact\(\)/);
});
