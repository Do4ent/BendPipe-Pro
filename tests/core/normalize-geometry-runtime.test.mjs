import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","normalize-geometry-runtime.js"),"utf8");
const properties=fs.readFileSync(path.join(root,"src","ui","properties-panel-runtime.js"),"utf8");
const selection=fs.readFileSync(path.join(root,"src","ui","object-selection-context-ui.js"),"utf8");
const build=fs.readFileSync(path.join(root,"scripts","build-standalone.mjs"),"utf8");

test("question 87: Normalize Geometry runtime is valid classic JavaScript and bundled",()=>{
  assert.doesNotThrow(()=>new vm.Script(runtime,{filename:"normalize-geometry-runtime.js"}));
  assert.match(runtime,/TubeBenderNormalizeGeometry/);
  assert.match(build,/data-tubebender-bundled="normalize-geometry-runtime"/);
  assert.match(build,/bundledNormalizeGeometryRuntime: true/);
});

test("question 87: Normalize is one History command and creates new IDs",()=>{
  assert.match(runtime,/modelCommand/);
  assert.match(runtime,/Fitted → Exact \/ Normalize Geometry/);
  assert.match(runtime,/exact\.id=makeId\("tube"\)/);
  assert.match(runtime,/project\(\)\.tubes\.push/);
  assert.match(runtime,/normalized_from_fitted_id/);
  assert.doesNotMatch(runtime,/for\(const key of Object\.keys\(source\)\)delete source\[key\]/);
});

test("question 87: Source and Fitted chain plus correction are retained",()=>{
  assert.match(runtime,/sourceChain/);
  assert.match(runtime,/source_file/);
  assert.match(runtime,/source_link/);
  assert.match(runtime,/import_source/);
  assert.match(runtime,/normalization_provenance/);
  assert.match(runtime,/correctionFor/);
  assert.match(runtime,/Compare with Fitted/);
});

test("question 87: comparison visibility is explicit for tubes and mesh instances",()=>{
  assert.match(runtime,/fitted\.uiHiddenIn3D=visible===false/);
  assert.match(runtime,/fitted\.visible=visible!==false/);
  assert.match(runtime,/exact\.uiHiddenIn3D=false/);
  assert.match(runtime,/normalization_compare/);
});

test("question 87: Properties exposes normalization correction and actions",()=>{
  assert.match(properties,/normalizeApi/);
  assert.match(properties,/data-property-normalize/);
  assert.match(properties,/data-property-compare-normalized/);
  assert.match(properties,/Geometry status/);
  assert.match(properties,/Max correction/);
});

test("question 87: 3D and TreeView context menu exposes Normalize and Compare",()=>{
  assert.match(selection,/data-object-action="normalize-geometry"/);
  assert.match(selection,/data-object-action="compare-normalized"/);
  assert.match(selection,/normalizeApi\(\)\?\.normalizeSelected/);
  assert.match(selection,/normalizeApi\(\)\?\.compareNormalized/);
});
