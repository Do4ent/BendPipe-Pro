import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const output=path.join(root,"dist","TubeBender_CAD_VC207R7_M1_Standalone.html");

test("A20: standalone build embeds guarded DWFx importer and preserves JSON path",()=>{
  const stdout=execFileSync(
    process.execPath,
    ["scripts/build-standalone.mjs"],
    {cwd:root,encoding:"utf8"}
  );
  const report=JSON.parse(stdout);
  assert.equal(report.bundledDwfxImporter,true);
  assert.equal(report.offlineCoreReady,true);

  const html=fs.readFileSync(output,"utf8");
  assert.match(html,/data-tubebender-bundled="dwfx-import"/);
  assert.match(html,/data-tubebender-bundled="dwfx-current-project-ui"/);
  assert.match(html,/poImportCurrentBtn/);
  assert.match(html,/Импортировать в текущий проект/);
  assert.match(html,/importSelectedDwfxTubesIntoCurrentProject/);
  assert.match(html,/tbHistoryBegin\("Импортировать DWFx геометрию"\)/);
  assert.match(html,/window\.TubeBenderDwfxImport=Object\.freeze\(\{importSelectedDwfxFile,mergeDwfxTubesIntoCurrentProject\}\)/);
  assert.match(html,/if\(\/\\\.dwfx\$\/i\.test\(String\(file\.name\|\|''\)\)\)/);
  assert.match(html,/result\?\.status==='requirements_pending'/);
  assert.match(html,/requirement\?\.kind==='bbox'/);
  assert.match(html,/Введите размер корпуса/);
  assert.match(html,/explicitBBox/);
  assert.match(html,/result\?\.status!=='dwfx_project_candidate'/);
  assert.match(html,/const raw=await file\.text\(\)/);
  assert.match(html,/await poLoadRawText\(raw,/);
  assert.doesNotMatch(html,/src=["'][^"']*browser-file-import\.mjs/);
});

test("A20: standalone DWFx module graph is inline and does not rely on relative module files",()=>{
  if(!fs.existsSync(output)){
    execFileSync(process.execPath,["scripts/build-standalone.mjs"],{cwd:root});
  }
  const html=fs.readFileSync(output,"utf8");
  const marker='data-tubebender-bundled="dwfx-import"';
  const i=html.indexOf(marker);
  assert.ok(i>=0);
  const start=html.lastIndexOf("<script",i);
  const end=html.indexOf("</script>",i);
  const moduleBlock=html.slice(start,end);

  assert.match(moduleBlock,/data:text\/javascript;base64,/);
  assert.doesNotMatch(moduleBlock,/from\s+["']\.\.?\//);
  assert.doesNotMatch(moduleBlock,/import\s+["']\.\.?\//);
});

test("A20: standalone DWFx branch keeps production blocker metadata in project-open result",()=>{
  if(!fs.existsSync(output)){
    execFileSync(process.execPath,["scripts/build-standalone.mjs"],{cwd:root});
  }
  const html=fs.readFileSync(output,"utf8");
  assert.match(html,/rawDwfxImport/);
  assert.match(html,/production_ready:false/);
  assert.match(html,/DWFx · импорт заблокирован/);
});


test("A20: standalone never falls through to old workspace bbox when DWFx bbox is unresolved",()=>{
  if(!fs.existsSync(output)){
    execFileSync(process.execPath,["scripts/build-standalone.mjs"],{cwd:root});
  }
  const html=fs.readFileSync(output,"utf8");
  const dwfxStart=html.indexOf("if(/\\.dwfx$/i.test(String(file.name||'')))");
  assert.ok(dwfxStart>=0);
  const jsonStart=html.indexOf("const raw=await file.text()",dwfxStart);
  const block=html.slice(dwfxStart,jsonStart);
  assert.match(block,/requirements_pending/);
  assert.match(block,/window\.prompt/);
  assert.match(block,/bbox:explicitBBox/);
  assert.doesNotMatch(block,/bbox:state\.bbox/);
  assert.doesNotMatch(block,/state\.bbox/);
});


test("A20: standalone project-open picker and drag-drop both accept DWFx",()=>{
  if(!fs.existsSync(output)){
    execFileSync(process.execPath,["scripts/build-standalone.mjs"],{cwd:root});
  }
  const html=fs.readFileSync(output,"utf8");
  assert.match(html,/\.json,\.dwfx,application\/json,application\/octet-stream/);
  assert.match(html,/\.\(\?:json\|dwfx\)\$/);
  assert.match(html,/Нужен JSON- или DWFx-файл проекта/);
  assert.match(html,/перетащите JSON\/DWFx-файл проекта/);
});
