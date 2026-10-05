import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","layers-runtime.js"),"utf8");
const contextUi=fs.readFileSync(path.join(root,"src","ui","object-selection-context-ui.js"),"utf8");
const properties=fs.readFileSync(path.join(root,"src","ui","properties-panel-runtime.js"),"utf8");
const locks=fs.readFileSync(path.join(root,"src","ui","object-lock-runtime.js"),"utf8");
const build=fs.readFileSync(path.join(root,"scripts","build-standalone.mjs"),"utf8");

test("question 72: Layers runtime is valid classic JavaScript and bundled",()=>{
  assert.doesNotThrow(()=>new vm.Script(runtime,{filename:"layers-runtime.js"}));
  assert.match(runtime,/TubeBenderLayers/);
  assert.match(build,/data-tubebender-bundled="layers-runtime"/);
  assert.match(build,/bundledLayersRuntime: true/);
});

test("question 72: Layers panel exposes active layer visibility freeze lock and style",()=>{
  assert.match(runtime,/data-active-layer/);
  assert.match(runtime,/data-layer-visible/);
  assert.match(runtime,/data-layer-frozen/);
  assert.match(runtime,/data-layer-locked/);
  assert.match(runtime,/data-layer-color/);
  assert.match(runtime,/data-layer-linetype/);
  assert.match(runtime,/data-layer-weight/);
  assert.match(runtime,/data-layer-new/);
  assert.match(runtime,/data-layer-delete/);
});

test("question 72: selected objects can be assigned to a layer and TreeView can filter",()=>{
  assert.match(runtime,/function assignSelection\(/);
  assert.match(runtime,/Назначить выбранным/);
  assert.match(runtime,/layer_tree_filter_id/);
  assert.match(runtime,/data-layer-filter/);
  assert.match(runtime,/row\.hidden=!!filter/);
  assert.match(runtime,/tb-layer-swatch/);
});

test("question 72: Freeze is enforced for TreeView 3D selection and Snap",()=>{
  assert.match(runtime,/function is3DObjectInteractive\(/);
  assert.match(runtime,/visibility\.selectable===true/);
  assert.match(contextUi,/layerApi\(\)\?\.is3DObjectInteractive/);
  assert.match(contextUi,/Слой заморожен/);
  assert.match(contextUi,/parseSelectionKey:parseKey/);
});

test("question 72: Layer Lock joins the central editing permission path",()=>{
  assert.match(locks,/TubeBenderLayers\?\.permissionForEntry/);
  assert.match(locks,/layerPermission\.allowed===false/);
});

test("question 72: Layer color lineweight and dashed styles are applied in 3D",()=>{
  assert.match(runtime,/resolveObjectStyle/);
  assert.match(runtime,/material\.color\.set\(style\.color\)/);
  assert.match(runtime,/LineDashedMaterial/);
  assert.match(runtime,/Dotted/);
  assert.match(runtime,/Center/);
  assert.match(runtime,/tbLayerLineWeightMm/);
});

test("question 72: Property Panel edits Layer and object ByLayer overrides",()=>{
  assert.match(properties,/label:"Layer",type:"select"/);
  assert.match(properties,/Color override/);
  assert.match(properties,/Linetype override/);
  assert.match(properties,/Lineweight override/);
  assert.match(properties,/sharedLayerFields/);
  assert.match(properties,/layerApi\(\)\?\.applyAll/);
});
