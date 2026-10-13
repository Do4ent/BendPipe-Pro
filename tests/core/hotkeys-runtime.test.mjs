import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","hotkeys-runtime.js"),"utf8");
const selection=fs.readFileSync(path.join(root,"src","ui","object-selection-context-ui.js"),"utf8");
const repeat=fs.readFileSync(path.join(root,"src","ui","repeat-command-runtime.js"),"utf8");
const snap=fs.readFileSync(path.join(root,"src","ui","snap-tracking-runtime.js"),"utf8");
const grips=fs.readFileSync(path.join(root,"src","ui","geometry-grips-runtime.js"),"utf8");
const build=fs.readFileSync(path.join(root,"scripts","build-standalone.mjs"),"utf8");

test("question 104: hotkeys runtime is classic JavaScript and bundled",()=>{
  assert.doesNotThrow(()=>new vm.Script(runtime,{filename:"hotkeys-runtime.js"}));
  assert.match(runtime,/TubeBenderHotkeys/);
  assert.match(build,/data-tubebender-bundled="hotkeys-runtime"/);
  assert.match(build,/__TB_HOTKEYS_MODULE_URL__/);
});

test("question 104: Settings Hotkeys supports remap reset conflict-safe save",()=>{
  assert.match(runtime,/Настройки · Горячие клавиши/);
  assert.match(runtime,/data-hotkey-id/);
  assert.match(runtime,/data-hotkey-reset/);
  assert.match(runtime,/data-hotkey-save/);
  assert.match(runtime,/domain\.normalizeHotkeyMap\(next\)/);
  assert.match(runtime,/localStorage\.setItem\(STORAGE_KEY/);
});

test("question 104: all main commands route to existing command APIs",()=>{
  assert.match(runtime,/case "move": window\.TubeBenderEditing\?\.open\?\.\("move"\)/);
  assert.match(runtime,/case "copy": window\.TubeBenderEditing\?\.open\?\.\("copy"\)/);
  assert.match(runtime,/case "rotate": window\.TubeBenderEditing\?\.open\?\.\("rotate"\)/);
  assert.match(runtime,/case "array": window\.TubeBenderEditing\?\.open\?\.\("array"\)/);
  assert.match(runtime,/case "divide": window\.TubeBenderEditing\?\.open\?\.\("split"\)/);
  assert.match(runtime,/focusScalarEdit\?\.\("length"\)/);
  assert.match(runtime,/focusScalarEdit\?\.\("angle"\)/);
  assert.match(runtime,/startQuickMeasure/);
  assert.match(runtime,/openSettings/);
  assert.match(runtime,/openSelectionFilter/);
  assert.match(runtime,/setCoordinateSystem/);
  assert.match(runtime,/TubeBenderHistory\?\.openPanel/);
  assert.match(runtime,/TubeBenderProperties\?\.open/);
});

test("question 104: shortcuts are shown on command buttons and tooltips",()=>{
  assert.match(runtime,/tb-hotkey-hint/);
  assert.match(runtime,/element\.title=/);
  assert.match(runtime,/\[data-tool="move"\]/);
  assert.match(runtime,/\[data-tool="copy"\]/);
  assert.match(runtime,/\[data-tool="rotate"\]/);
  assert.match(runtime,/\[data-tool="array"\]/);
  assert.match(runtime,/#tbPropertiesToggle/);
  assert.match(runtime,/#tbSnapSourceButton/);
  assert.match(runtime,/#tbMeasurementsButton/);
});

test("question 104: Selection Filter is enforced by shared selection path",()=>{
  assert.match(runtime,/TubeBenderSelectionFilter/);
  assert.match(runtime,/FILTER_KINDS/);
  assert.match(runtime,/Selection Filter/);
  assert.match(selection,/TubeBenderSelectionFilter\?\.allows/);
  assert.match(selection,/Тип объекта отключён фильтром выбора/);
});

test("question 104: Snap Length and Angle use explicit public APIs",()=>{
  assert.match(snap,/openSettings:/);
  assert.match(grips,/function focusScalarEdit\(kind\)/);
  assert.match(grips,/wanted=.*"line-length"/);
  assert.match(grips,/wanted=.*"bend-angle"/);
  assert.match(grips,/focusScalarEdit,setShowAll/);
});

test("question 104: Repeat Last uses remapped Enter Space chords when hotkeys runtime exists",()=>{
  assert.match(repeat,/hotkeys\.matchesCommand\(event,"repeatLast"\)/);
  assert.match(repeat,/hotkeys\.matchesCommand\(event,"repeatLastAlt"\)/);
  assert.match(repeat,/event\.key==="Enter"\|\|event\.key===" "/);
});
