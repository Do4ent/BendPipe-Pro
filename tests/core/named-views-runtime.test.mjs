import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","named-views-runtime.js"),"utf8");
const build=fs.readFileSync(path.join(root,"scripts","build-standalone.mjs"),"utf8");

test("question 108: Named Views runtime is valid classic JavaScript and bundled",()=>{
  assert.doesNotThrow(()=>new vm.Script(runtime,{filename:"named-views-runtime.js"}));
  assert.match(runtime,/TubeBenderNamedViews/);
  assert.match(build,/data-tubebender-bundled="named-views-runtime"/);
  assert.match(build,/__TB_NAMED_VIEWS_MODULE_URL__/);
});

test("question 108: capture stores camera zoom UCS work plane and environment",()=>{
  assert.match(runtime,/function captureCamera\(/);
  assert.match(runtime,/camera\.position/);
  assert.match(runtime,/controls\.target/);
  assert.match(runtime,/camera\.zoom/);
  assert.match(runtime,/function captureUcs\(/);
  assert.match(runtime,/bbox_anchor/);
  assert.match(runtime,/coordinate_offset/);
  assert.match(runtime,/function captureWorkPlane\(/);
  assert.match(runtime,/function captureEnvironment\(/);
  assert.match(runtime,/active_layer_id/);
  assert.match(runtime,/layer_tree_filter_id/);
});

test("question 108: restore applies projection and camera without invoking AutoFit",()=>{
  const block=runtime.slice(runtime.indexOf("function restoreCamera"),runtime.indexOf("function restoreUcs"));
  assert.match(block,/switchCameraProjection/);
  assert.match(block,/camera\.position\.set/);
  assert.match(block,/controls\.target\.set/);
  assert.match(block,/camera\.updateProjectionMatrix/);
  assert.doesNotMatch(block,/fitPipeToViewerKeepOrbit/);
  assert.doesNotMatch(block,/renderAll/);
});

test("question 108: UCS restore uses geometry-preserving coordinate anchor path",()=>{
  const block=runtime.slice(runtime.indexOf("function restoreUcs"),runtime.indexOf("function restoreWorkPlane"));
  assert.match(block,/setBBoxAnchor/);
  assert.match(block,/preserving physical world geometry/);
  assert.match(block,/TubeBenderUCS\?\.restore/);
});

test("question 108: work plane and Layer environment are restored with view",()=>{
  assert.match(runtime,/TubeBenderWorkPlane\?\.restore/);
  assert.match(runtime,/work_plane_state/);
  assert.match(runtime,/layer\.visible=saved\.visible!==false/);
  assert.match(runtime,/layer\.frozen=saved\.frozen===true/);
  assert.match(runtime,/layer\.locked=saved\.locked===true/);
  assert.match(runtime,/TubeBenderLayers\?\.applyAll/);
});

test("question 108: Named Views support Save Restore Update Rename Delete and Command Palette",()=>{
  for(const marker of ["data-nv-create","data-nv-restore","data-nv-update","data-nv-rename","data-nv-delete"])assert.match(runtime,new RegExp(marker));
  assert.match(runtime,/registerProvider/);
  assert.match(runtime,/name_en:"View: "/);
  assert.match(runtime,/run:\(\)=>restore\(view\.id\)/);
});
