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
  assert.equal(report.lazyDwfxRuntime,true);

  const html=fs.readFileSync(output,"utf8");
  assert.match(html,/data-tubebender-bundled="dwfx-import"/);
  assert.match(html,/data-tubebender-bundled="dwfx-current-project-ui"/);
  assert.match(html,/poImportCurrentBtn/);
  assert.match(html,/Импортировать в текущий проект/);
  assert.match(html,/importSelectedDwfxTubesIntoCurrentProject/);
  assert.match(html,/tbHistoryBegin\("Импортировать DWFx геометрию"\)/);
  assert.match(html,/data-tubebender-bundled="dwfx-lazy-bootstrap"/);
  assert.match(html,/loadDwfxModule/);
  assert.match(html,/mergeDwfxTubesIntoCurrentProject:async/);
  assert.doesNotMatch(html,/<script type="module" data-tubebender-bundled="dwfx-import"/);
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


test("A22: standalone DWFx runtime is injected only at the final document body close",()=>{
  if(!fs.existsSync(output)){
    execFileSync(process.execPath,["scripts/build-standalone.mjs"],{cwd:root});
  }
  const html=fs.readFileSync(output,"utf8");
  const marker=html.indexOf('data-tubebender-bundled="dwfx-import"');
  const firstBodyClose=html.indexOf("</body>");
  const finalBodyClose=html.lastIndexOf("</body>");

  assert.ok(firstBodyClose>=0);
  assert.ok(finalBodyClose>firstBodyClose);
  assert.ok(marker>firstBodyClose);
  assert.ok(marker<finalBodyClose);
  assert.match(html,/function isCurrentBodyPreferred\(\)/);
  assert.match(html,/function makeCurrentBodyPreferred\(\)/);
  assert.doesNotMatch(html,/observer\.observe\(dialog,\{subtree:true,childList:true,attributes:true\}\)/);
  assert.match(html,/button\.textContent!==nextText/);
  assert.match(html,/records\.every\(\(record\)=>record\.target===button\|\|button\.contains\(record\.target\)\)/);
});


test("A25: standalone bundles readonly DWFx reference scene into 3D and project tree",()=>{
  if(!fs.existsSync(output)){
    execFileSync(process.execPath,["scripts/build-standalone.mjs"],{cwd:root});
  }
  const html=fs.readFileSync(output,"utf8");

  assert.match(html,/data-tubebender-bundled="dwfx-reference-scene-ui"/);
  assert.match(html,/TubeBenderReferenceSceneUi\?\.render3D/);
  assert.match(html,/TubeBenderReferenceSceneUi\?\.treeItems/);
  assert.match(html,/TubeBenderReferenceSceneUi\?\.bindTree/);
  assert.match(html,/только чтение/);
  assert.match(html,/referenceGeometry=true/);
  assert.match(html,/editable_part_number/);
  assert.match(html,/hiddenNodeIds/);
  assert.match(html,/collapsedNodeIds/);
});


test("A26: standalone exposes grouped reference component actions",()=>{
  if(!fs.existsSync(output)){
    execFileSync(process.execPath,["scripts/build-standalone.mjs"],{cwd:root});
  }
  const html=fs.readFileSync(output,"utf8");

  assert.match(html,/data-ref-scene-select/);
  assert.match(html,/data-ref-select/);
  assert.match(html,/data-ref-bulk-action="show"/);
  assert.match(html,/data-ref-bulk-action="hide"/);
  assert.match(html,/data-ref-bulk-action="transparent"/);
  assert.match(html,/data-ref-bulk-action="delete"/);
  assert.match(html,/transparentNodeIds/);
  assert.match(html,/opacity:transparent \? \.24 : 1/);
  assert.match(html,/modelCommand:tbModelCommand/);
  assert.match(html,/Удалить импортированные компоненты/);
});


test("A27: standalone exposes Ctrl Shift grouped reference selection",()=>{
  if(!fs.existsSync(output)){
    execFileSync(process.execPath,["scripts/build-standalone.mjs"],{cwd:root});
  }
  const html=fs.readFileSync(output,"utf8");

  assert.match(html,/Ctrl\+клик · Shift\+клик/);
  assert.match(html,/event\.ctrlKey\|\|event\.metaKey\|\|event\.shiftKey/);
  assert.match(html,/applyModifierSelection/);
  assert.match(html,/visibleSelectionKeys/);
  assert.match(html,/ctrlKey:event\.ctrlKey/);
  assert.match(html,/shiftKey:event\.shiftKey/);
});


test("A28: standalone nests imported DWFx geometry under one project-tree branch",()=>{
  if(!fs.existsSync(output)){
    execFileSync(process.execPath,["scripts/build-standalone.mjs"],{cwd:root});
  }
  const html=fs.readFileSync(output,"utf8");

  assert.match(html,/Импортированная геометрия/);
  assert.match(html,/data-ref-root-row="1"/);
  assert.match(html,/data-ref-root-toggle="1"/);
  assert.match(html,/data-ref-root-select="1"/);
  assert.match(html,/data-ref-scene-toggle/);
  assert.match(html,/referenceGeometryTreeCollapsed/);
  assert.match(html,/treeCollapsed/);
});


test("A29: project-open inspection errors panel is collapsible and persistent",()=>{
  if(!fs.existsSync(output)){
    execFileSync(process.execPath,["scripts/build-standalone.mjs"],{cwd:root});
  }
  const html=fs.readFileSync(output,"utf8");

  assert.match(html,/PO_INSPECTION_COLLAPSE_KEY/);
  assert.match(html,/poInspectionCollapsed/);
  assert.match(html,/poInspectionToggle/);
  assert.match(html,/po-inspection-body/);
  assert.match(html,/po-inspection-body\.collapsed/);
  assert.match(html,/Свернуть панель ошибок/);
  assert.match(html,/Развернуть панель ошибок/);
  assert.match(html,/localStorage\.setItem\(PO_INSPECTION_COLLAPSE_KEY/);
  assert.match(html,/Ошибок:/);
  assert.match(html,/Предупреждений:/);
});


test("A30: 3D error overlay is collapsible and keeps a compact issue summary",()=>{
  if(!fs.existsSync(output)){
    execFileSync(process.execPath,["scripts/build-standalone.mjs"],{cwd:root});
  }
  const html=fs.readFileSync(output,"utf8");

  assert.match(html,/id="boundsCollapseBtn"/);
  assert.match(html,/id="boundsWarningSummary"/);
  assert.match(html,/bounds-warning\.collapsed/);
  assert.match(html,/BOUNDS_WARNING_COLLAPSE_KEY/);
  assert.match(html,/setBoundsWarningCollapsed/);
  assert.match(html,/updateBoundsWarningCollapseUi/);
  assert.match(html,/Нарушений: /);
  assert.match(html,/Свернуть окно ошибок/);
  assert.match(html,/Развернуть окно ошибок/);
  assert.match(html,/localStorage\.setItem\(BOUNDS_WARNING_COLLAPSE_KEY/);
  assert.match(html,/boundsCollapseBtn'\)\?\.addEventListener/);
});
