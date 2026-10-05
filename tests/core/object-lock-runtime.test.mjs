import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","object-lock-runtime.js"),"utf8");
const contextUi=fs.readFileSync(path.join(root,"src","ui","object-selection-context-ui.js"),"utf8");
const properties=fs.readFileSync(path.join(root,"src","ui","properties-panel-runtime.js"),"utf8");
const gizmo=fs.readFileSync(path.join(root,"src","ui","transform-gizmo-runtime.js"),"utf8");
const editing=fs.readFileSync(path.join(root,"src","ui","editing-ui.js"),"utf8");
const arrays=fs.readFileSync(path.join(root,"src","ui","associative-array-runtime.js"),"utf8");
const build=fs.readFileSync(path.join(root,"scripts","build-standalone.mjs"),"utf8");

test("question 71: object lock runtime is valid classic JavaScript and bundled",()=>{
  assert.doesNotThrow(()=>new vm.Script(runtime,{filename:"object-lock-runtime.js"}));
  assert.match(runtime,/TubeBenderObjectLocks/);
  assert.match(runtime,/Lock Object/);
  assert.match(runtime,/Lock Position/);
  assert.match(build,/data-tubebender-bundled="object-lock-runtime"/);
  assert.match(build,/bundledObjectLocks: true/);
});

test("question 71: TreeView receives status icon only, without geometry color mutation",()=>{
  assert.match(runtime,/tb-lock-badge/);
  assert.match(runtime,/🔒/);
  assert.match(runtime,/📍/);
  assert.match(runtime,/data-tree-tube/);
  assert.match(runtime,/data-import-mesh-instance/);
  assert.doesNotMatch(runtime,/material\.color/);
  assert.doesNotMatch(runtime,/setHex\(/);
});

test("question 71: context menu exposes both lock modes and protected actions",()=>{
  assert.match(contextUi,/data-object-action="lock-object"/);
  assert.match(contextUi,/data-object-action="lock-position"/);
  assert.match(contextUi,/data-object-action="unlock-object"/);
  assert.match(contextUi,/lockAllowed\("move"/);
  assert.match(contextUi,/lockAllowed\("delete"/);
  assert.match(contextUi,/lockAllowed\("break-link"/);
  assert.match(contextUi,/lockAllowed\("anchor"/);
});

test("question 71: Properties and Gizmo respect object locks",()=>{
  assert.match(properties,/canSelection\?\.\("properties"/);
  assert.match(properties,/data-property-lock="Object"/);
  assert.match(properties,/data-property-lock="Position"/);
  assert.match(gizmo,/canSelection\?\.\("rotate"/);
  assert.match(gizmo,/canSelection\?\.\("move"/);
});

test("question 71: specialized editing and associative arrays cannot bypass Lock Object",()=>{
  assert.match(editing,/lockAllowed\("geometry"/);
  assert.match(editing,/lockAllowed\("rotate"/);
  assert.match(editing,/lockAllowed\("array"/);
  assert.match(editing,/lockAllowed\("transform-stack"/);
  assert.match(arrays,/assertArrayEditable/);
  assert.match(arrays,/assertSourcesEditable/);
  assert.match(arrays,/Объект заблокирован/);
});

test("question 71: model command has atomic locked-object mutation guard",()=>{
  assert.match(build,/function tbLockedMutationViolation/);
  assert.match(build,/tbLockGuardObjectComparable/);
  assert.match(build,/tbLockGuardPositionComparable/);
  assert.match(build,/const lockViolation=tbLockedMutationViolation/);
  assert.match(build,/if\(token\?\.before\)tbHistoryRestore\(token\.before\)/);
  assert.match(build,/ptToast\(lockViolation\.message\|\|'Объект заблокирован'\)/);
});
