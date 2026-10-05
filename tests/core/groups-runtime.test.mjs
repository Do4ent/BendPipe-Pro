import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","groups-runtime.js"),"utf8");
const selection=fs.readFileSync(path.join(root,"src","ui","object-selection-context-ui.js"),"utf8");
const locks=fs.readFileSync(path.join(root,"src","ui","object-lock-runtime.js"),"utf8");
const props=fs.readFileSync(path.join(root,"src","ui","properties-panel-runtime.js"),"utf8");
const build=fs.readFileSync(path.join(root,"scripts","build-standalone.mjs"),"utf8");

test("question 73: Groups runtime is valid classic JavaScript and bundled",()=>{
  assert.doesNotThrow(()=>new vm.Script(runtime,{filename:"groups-runtime.js"}));
  assert.match(runtime,/TubeBenderGroups/);
  assert.match(build,/data-tubebender-bundled="groups-runtime"/);
  assert.match(build,/bundledGroupsRuntime: true/);
});

test("question 73: TreeView has nested Group and member rows",()=>{
  assert.match(runtime,/data-project-group/);
  assert.match(runtime,/data-group-member-key/);
  assert.match(runtime,/groupTreeHtml/);
  assert.match(runtime,/Nested Group/);
  assert.match(selection,/PREFIX\.group/);
  assert.match(selection,/kind:"group"/);
});

test("question 73: normal click selects Group while Ctrl click keeps member selection",()=>{
  assert.match(selection,/const direct=!!\(event\.ctrlKey\|\|event\.metaKey\)/);
  assert.match(selection,/primaryGroupForEntry/);
  assert.match(selection,/if\(row\.matches\("\[data-group-member-key\]"\)&&!direct\)/);
  assert.match(selection,/groupKey\(row\.dataset\.groupOwner\)/);
});

test("question 73: Group exposes rename add remove Ungroup visibility and lock",()=>{
  assert.match(runtime,/createFromSelection/);
  assert.match(runtime,/function rename\(/);
  assert.match(runtime,/function addSelection\(/);
  assert.match(runtime,/function removeSelection\(/);
  assert.match(runtime,/function ungroup\(/);
  assert.match(runtime,/function setVisible\(/);
  assert.match(runtime,/function setLock\(/);
  assert.match(runtime,/Ungroup/);
});

test("question 73: Group Move Rotate Copy and Array are rigid logical operations",()=>{
  assert.match(runtime,/function moveGroups\(/);
  assert.match(runtime,/function rotateGroup\(/);
  assert.match(runtime,/function copyGroup\(/);
  assert.match(runtime,/function arrayGroup\(/);
  assert.match(runtime,/translateLegacyTubeRigid/);
  assert.match(runtime,/rotateLegacyTubeRigid/);
  assert.match(runtime,/copyEditableMeshInstance/);
  assert.match(runtime,/createEditableMeshInstanceByRef/);
});

test("question 73: Group Array is one History command and Group Copy remaps internal references",()=>{
  const arrayBlock=runtime.slice(runtime.indexOf("function arrayGroup"),runtime.indexOf("function hiddenLeafKeys"));
  assert.match(arrayBlock,/command\("Array Group"/);
  assert.match(arrayBlock,/copyGroupGraph/);
  assert.doesNotMatch(arrayBlock,/copyGroup\(/);
  assert.match(runtime,/const idMap=new Map\(\),memberMap=new Map\(\)/);
  assert.match(runtime,/remapTubeDependencies/);
  assert.match(runtime,/cloneDimension\(dim,idMap\)/);
  assert.match(runtime,/object_id:idMap\.get/);
});

test("question 73: Source references are converted only inside transformed Group tree",()=>{
  assert.match(runtime,/replaceGroupMemberRefInTree/);
  assert.match(runtime,/convertRefToMesh\(ref,rootGroupId\)/);
  assert.match(runtime,/ensureEditableMeshInstanceByRef/);
  assert.doesNotMatch(runtime,/function replaceGroupMemberRef\(oldRef,newRef\)/);
});

test("question 73: Group locks propagate to members and Properties can inspect Group",()=>{
  assert.match(locks,/TubeBenderGroups\?\.permissionForEntry/);
  assert.match(locks,/entry\.kind==="group"/);
  assert.match(props,/entry\.kind==="group"/);
  assert.match(props,/Logical Group/);
  assert.match(props,/Dependencies preserved/);
});

test("question 73: standard Move delegates Group selection to atomic group movement",()=>{
  assert.match(selection,/entries\.every\(entry=>entry\.kind==="group"\)/);
  assert.match(selection,/groupsApi\(\)\?\.moveGroups/);
});
