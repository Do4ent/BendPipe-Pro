import test from "node:test";
import assert from "node:assert/strict";
import {
  HOTKEY_COMMANDS,
  defaultHotkeyMap,
  normalizeChord,
  eventChord,
  normalizeHotkeyMap,
  setHotkey,
  commandForChord,
  matchesCommand,
  serializeHotkeyMap,
  parseHotkeyMap
} from "../../src/domain/ui/hotkeys.mjs";

test("question 104: default CAD hotkeys match accepted command map",()=>{
  const map=defaultHotkeyMap();
  assert.deepEqual({
    move:map.move,copy:map.copy,rotate:map.rotate,array:map.array,divide:map.divide,
    length:map.length,angle:map.angle,quickMeasure:map.quickMeasure,snapSettings:map.snapSettings,
    selectionFilter:map.selectionFilter,activeUcs:map.activeUcs,history:map.history,properties:map.properties,
    cancel:map.cancel,repeatLast:map.repeatLast,repeatLastAlt:map.repeatLastAlt
  },{
    move:"M",copy:"C",rotate:"R",array:"A",divide:"D",
    length:"L",angle:"G",quickMeasure:"Q",snapSettings:"S",
    selectionFilter:"F",activeUcs:"U",history:"H",properties:"P",
    cancel:"Escape",repeatLast:"Enter",repeatLastAlt:"Space"
  });
  assert.equal(HOTKEY_COMMANDS.length,16);
});

test("question 104: chords normalize browser keys and modifiers",()=>{
  assert.equal(normalizeChord("ctrl+shift+m"),"Ctrl+Shift+M");
  assert.equal(eventChord({key:"m",ctrlKey:false,altKey:false,shiftKey:false,metaKey:false}),"M");
  assert.equal(eventChord({key:" ",ctrlKey:false,altKey:false,shiftKey:false,metaKey:false}),"Space");
  assert.equal(eventChord({key:"Escape"}),"Escape");
});

test("question 104: remapping is conflict-safe and persistent",()=>{
  const defaults=normalizeHotkeyMap({});
  const remapped=setHotkey(defaults,"move","Ctrl+M");
  assert.equal(remapped.move,"Ctrl+M");
  assert.equal(commandForChord(remapped,"Ctrl+M").id,"move");
  assert.throws(()=>setHotkey(remapped,"copy","Ctrl+M"),/Hotkey conflict/);
  const parsed=parseHotkeyMap(serializeHotkeyMap(remapped));
  assert.equal(parsed.move,"Ctrl+M");
});

test("question 104: command matching honors remapped Escape Enter and Space",()=>{
  let map=defaultHotkeyMap();
  map=setHotkey(map,"cancel","X");
  map=setHotkey(map,"repeatLast","Ctrl+Enter");
  map=setHotkey(map,"repeatLastAlt","Shift+Space");
  assert.equal(matchesCommand({key:"x"},map,"cancel"),true);
  assert.equal(matchesCommand({key:"Enter",ctrlKey:true},map,"repeatLast"),true);
  assert.equal(matchesCommand({key:" ",shiftKey:true},map,"repeatLastAlt"),true);
});
