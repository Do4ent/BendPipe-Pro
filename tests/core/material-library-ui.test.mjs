import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const uiPath=path.join(root,"src","ui","material-library-ui.js");

test("material library UI remains valid classic JavaScript",()=>{
  const code=fs.readFileSync(uiPath,"utf8");
  assert.doesNotThrow(()=>new vm.Script(code,{filename:"material-library-ui.js"}));
  assert.match(code,/__TB_MATERIAL_MODULE_URL__/);
  assert.match(code,/data-tab="library"/);
  assert.match(code,/data-tab="tube"/);
  assert.match(code,/data-tab="project"/);
  assert.match(code,/data-tab="templates"/);
});

test("material library UI persists global and project material stores separately",()=>{
  const code=fs.readFileSync(uiPath,"utf8");
  assert.match(code,/tubebender\.materials\.global\.v1/);
  assert.match(code,/p\?\.materialLibrary/);
  assert.match(code,/global_profiles/);
  assert.match(code,/project_profiles/);
  assert.match(code,/persistGlobal/);
  assert.match(code,/persistProject/);
});

test("tube material UI stores only profile reference and marks calculations stale",()=>{
  const code=fs.readFileSync(uiPath,"utf8");
  assert.match(code,/current\.material_profile_id=id/);
  assert.match(code,/current\.material_calculation_state="Stale"/);
  assert.match(code,/current\.material_profile_id=null/);
  assert.match(code,/Missing Material/);
  assert.doesNotMatch(code,/current\.springback=/);
  assert.doesNotMatch(code,/current\.yield_strength_mpa=/);
});

test("default material applies only to newly observed tubes",()=>{
  const code=fs.readFileSync(uiPath,"utf8");
  assert.match(code,/knownTubeIds=new Set/);
  assert.match(code,/const added=\(p\.tubes\?\?\[\]\)\.filter/);
  assert.match(code,/if\(t\.material_profile_id\)continue/);
  assert.match(code,/t\.material_profile_id=defaultId/);
  assert.match(code,/Default Material применяется только к трубам, созданным после изменения настройки/);
});

test("material templates create independent project materials without provenance",()=>{
  const code=fs.readFileSync(uiPath,"utf8");
  assert.match(code,/createMaterialFromTemplateUi/);
  assert.match(code,/domain\.createMaterialFromTemplate/);
  assert.match(code,/Материал создан независимо от шаблона/);
});

test("project material edits participate in model command history",()=>{
  const code=fs.readFileSync(uiPath,"utf8");
  assert.match(code,/api\(\)\?\.modelCommand\?api\(\)\.modelCommand/);
  assert.match(code,/Изменить Material Profile/);
  assert.match(code,/Назначить материал трубе/);
  assert.match(code,/Изменить настройки материалов проекта/);
});


test("tube material UI requires explicit acknowledgement of current profile warnings",()=>{
  const code=fs.readFileSync(uiPath,"utf8");
  assert.match(code,/data-tube-ack-warning/);
  assert.match(code,/material_warning_ack_signature/);
  assert.match(code,/materialFingerprint/);
  assert.match(code,/warning_ack_required/);
  assert.match(code,/Подтвердить предупреждения Material Profile/);
  assert.match(code,/window\.confirm\(message\)/);
});

test("changing or clearing tube material invalidates previous warning acknowledgement",()=>{
  const code=fs.readFileSync(uiPath,"utf8");
  const resets=code.match(/material_warning_ack_signature=null/g)??[];
  assert.ok(resets.length>=2);
});
