import test from "node:test";
import assert from "node:assert/strict";
import {
  COMMAND_DEFINITIONS,
  defaultAliasMap,
  normalizeAliasMap,
  setAliases,
  searchCommands,
  resolveCommand,
  pushCommandHistory,
  normalizePaletteState,
  serializePaletteState,
  parsePaletteState
} from "../../src/domain/ui/command-palette.mjs";

test("question 105: palette resolves English Russian names and aliases",()=>{
  const aliases=defaultAliasMap();
  assert.equal(resolveCommand("MOVE",{alias_map:aliases}).id,"move");
  assert.equal(resolveCommand("Переместить",{alias_map:aliases}).id,"move");
  assert.equal(resolveCommand("M",{alias_map:aliases}).id,"move");
  assert.equal(resolveCommand("Свойства",{alias_map:aliases}).id,"properties");
  assert.equal(resolveCommand("PROP",{alias_map:aliases}).id,"properties");
});

test("question 105: partial and fuzzy search ranks relevant commands",()=>{
  const aliases=defaultAliasMap();
  assert.equal(searchCommands("rot",{alias_map:aliases})[0].command.id,"rotate");
  assert.equal(searchCommands("измер",{alias_map:aliases})[0].command.id,"quickMeasure");
  assert.ok(searchCommands("prp",{alias_map:aliases}).some(item=>item.command.id==="properties"));
});

test("question 105: aliases are remappable and conflict-safe",()=>{
  let aliases=defaultAliasMap();
  aliases=setAliases(aliases,"move",["MV","MOVE"]);
  assert.deepEqual(aliases.move,["MV","MOVE"]);
  assert.equal(resolveCommand("MV",{alias_map:aliases}).id,"move");
  assert.throws(()=>setAliases(aliases,"copy",["MV"]),/alias conflict/i);
});

test("question 105: query history is newest-first deduplicated and persistent",()=>{
  let history=[];
  history=pushCommandHistory(history,"MOVE");
  history=pushCommandHistory(history,"ROTATE");
  history=pushCommandHistory(history,"MOVE");
  assert.deepEqual(history,["MOVE","ROTATE"]);
  const state=normalizePaletteState({history,aliases:defaultAliasMap(),recent_ids:["move"]});
  const parsed=parsePaletteState(serializePaletteState(state));
  assert.deepEqual(parsed.history,["MOVE","ROTATE"]);
  assert.equal(parsed.recent_ids[0],"move");
  assert.equal(COMMAND_DEFINITIONS.length>=16,true);
});
