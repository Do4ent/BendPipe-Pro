import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const editing=fs.readFileSync(path.join(root,"src","ui","editing-ui.js"),"utf8");
const groups=fs.readFileSync(path.join(root,"src","ui","groups-runtime.js"),"utf8");
const build=fs.readFileSync(path.join(root,"scripts","build-standalone.mjs"),"utf8");

test("question 92: editing and group runtimes stay valid classic JavaScript",()=>{
  assert.doesNotThrow(()=>new vm.Script(editing,{filename:"editing-ui.js"}));
  assert.doesNotThrow(()=>new vm.Script(groups,{filename:"groups-runtime.js"}));
});

test("question 92: ordinary Copy exposes mandatory external-dependency choice",()=>{
  assert.match(editing,/data-copy-external-policy/);
  assert.match(editing,/Detach external/);
  assert.match(editing,/Keep external/);
  assert.match(editing,/requireCopyExternalChoice/);
  assert.match(editing,/requires_external_choice/);
  assert.match(editing,/createTubeCopyBatch/);
  assert.match(editing,/applyCopyDependencyBatch/);
});

test("question 92: ordinary multi-object Copy preallocates IDs and remaps a cohort",()=>{
  assert.match(editing,/const idMap=new Map\(list\.map\(source=>\[String\(source\.id\),makeId\("tube"\)\]\)\)/);
  assert.match(editing,/__copy_source_id=String\(source\.id\)/);
  assert.match(editing,/created\.push\(\.\.\.createTubeCopyBatch\(sources,delta/);
});

test("question 92: Group Copy uses the same explicit policy",()=>{
  assert.match(groups,/COPY_DEPENDENCIES_URL/);
  assert.match(groups,/groupCopyChoice/);
  assert.match(groups,/data-group-external-policy/);
  assert.match(groups,/external_policy:null/);
  assert.match(groups,/applyCopyDependencyPolicy/);
  assert.match(groups,/remapTubeDependencies/);
});

test("question 92: standalone build injects the shared policy into both runtimes",()=>{
  assert.match(build,/copyDependenciesDomainPath/);
  assert.match(build,/__TB_COPY_DEPENDENCIES_MODULE_URL__/);
  assert.match(build,/copyDependenciesDomainUrl/);
});
