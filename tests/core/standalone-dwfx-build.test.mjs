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


test("A31: standalone rounds recognized DWFx OD to active pipe table without auto-tooling",()=>{
  if(!fs.existsSync(output)){
    execFileSync(process.execPath,["scripts/build-standalone.mjs"],{cwd:root});
  }
  const html=fs.readFileSync(output,"utf8");

  assert.match(html,/normalizeImportedProjectDiameters:async/);
  assert.match(html,/diameter_catalog:/);
  assert.match(html,/diameter_rounding_tolerance_mm:0\.35/);
  assert.match(html,/recommended_tolerance_mm:0\.35/);
  assert.match(html,/diameter_normalized_count/);
  assert.match(html,/diameter_large_deviation_count/);
  assert.match(html,/const importBlocked=t\?\.importValidation\?\.productionBlocked===true/);
  assert.match(html,/if\(!t\.toolingId&&!importBlocked\)/);
  assert.match(html,/if\(!t\.toolingId&&importBlocked\)/);
});


test("A32: main 3D viewer preserves user zoom and normalizes mouse-wheel delta modes",()=>{
  if(!fs.existsSync(output)){
    execFileSync(process.execPath,["scripts/build-standalone.mjs"],{cwd:root});
  }
  const html=fs.readFileSync(output,"utf8");

  assert.match(html,/wheelDeltaPixels\(e\)/);
  assert.match(html,/if\(mode===1\)return raw\*33/);
  assert.match(html,/if\(mode===2\)return raw\*Math\.max\(180,this\.domElement\?\.clientHeight/);
  assert.match(html,/const speed=Math\.max\(0\.1,Number\(this\.zoomSpeed\)\|\|1\)/);
  assert.match(html,/const factor=Math\.exp\(normalized\*0\.0017\*speed\)/);

  const resizeStart=html.indexOf("function resize(){");
  const animateStart=html.indexOf("function animate(){",resizeStart);
  assert.ok(resizeStart>=0&&animateStart>resizeStart);
  const resizeBlock=html.slice(resizeStart,animateStart);
  assert.match(resizeBlock,/renderer\.setSize\(w, h, false\)/);
  assert.match(resizeBlock,/markViewerDirty\(\)/);
  assert.doesNotMatch(resizeBlock,/fitPipeToViewerKeepOrbit\(\)/);

  assert.match(html,/this\.camera\.near=Math\.max\(0\.001,nextDistance\/10000\)/);
  assert.match(html,/this\.camera\.far=Math\.max\(5000,nextDistance\*10000\)/);
});


test("A33: standalone preserves exact imported spatial start vector",()=>{
  if(!fs.existsSync(output)){
    execFileSync(process.execPath,["scripts/build-standalone.mjs"],{cwd:root});
  }
  const html=fs.readFileSync(output,"utf8");

  assert.match(html,/startVector: null/);
  assert.match(html,/const sv=state\.startVector/);
  assert.match(html,/const sv=tube\?\.startVector/);
  assert.match(html,/t\.startVector = state\.startVector \? clone\(state\.startVector\) : null/);
  assert.match(html,/state\.startVector = \(t\.startVector && typeof t\.startVector === 'object'\)/);
  assert.match(html,/snap\.startVector=state\.startVector\?clone\(state\.startVector\):null/);
  assert.match(html,/startVector:x\?\.startVector/);
  assert.match(html,/state\.startVector = \{x:dir\.x,y:dir\.y,z:dir\.z\}/);
});


test("A34: standalone protects imported tube diameter from 1/4 fallback",()=>{
  if(!fs.existsSync(output)){
    execFileSync(process.execPath,["scripts/build-standalone.mjs"],{cwd:root});
  }
  const html=fs.readFileSync(output,"utf8");

  assert.match(html,/function importedDiameterIndexFromEvidence\(tube,db=pipeDb\)/);
  assert.match(html,/diameterNormalization\?\.table_outer_diameter_mm/);
  assert.match(html,/derived_outer_diameter_mm/);
  assert.match(html,/preferredIndex!==null&&preferredIndex!==undefined&&preferredIndex!==''/);
  assert.match(html,/const importedDwfx=String\(t\.importEvidence\?\.source\?\.format/);
  assert.match(html,/productionBlocked:priorImportValidation\.productionBlocked===true/);
  assert.match(html,/const importBlocked=active\.importValidation\?\.productionBlocked===true/);
  assert.match(html,/active\.toolingId=null/);
  assert.match(html,/state\.toolingId=null/);
});


test("A36: standalone keeps rounded editable origin instead of restoring exact source origin",()=>{
  if(!fs.existsSync(output)){
    execFileSync(process.execPath,["scripts/build-standalone.mjs"],{cwd:root});
  }
  const html=fs.readFileSync(output,"utf8");

  assert.match(html,/spatial\?\.editable_origin_mm/);
  assert.match(html,/normalized\?\.editable_origin_mm/);
  assert.match(html,/linear_rounding_increment_mm:1/);
});


test("A39: every tube uses one opaque copper body color outside edit isolation",()=>{
  if(!fs.existsSync(output)){
    execFileSync(process.execPath,["scripts/build-standalone.mjs"],{cwd:root});
  }
  const html=fs.readFileSync(output,"utf8");

  assert.match(html,/const bendBodyColor=0xc77738/);
  assert.match(html,/tubeElementMaterial\(0xc77738, rowIndex\)/);
  assert.match(html,/addNode\(pipeGroup,pos,0xc77738,.06,i,'LINE'\)/);
  assert.match(html,/addNode\(pipeGroup,pos,0xc77738,.06,i,'BEND'\)/);
  assert.match(html,/const PASSIVE_TUBE_COLOR=0xc77738/);
  assert.match(html,/const PASSIVE_TUBE_OPACITY=1/);
  assert.match(html,/transparent:false,[\s\S]*opacity:1,[\s\S]*depthWrite:true/);
});


test("A48: standalone exposes synchronized 3D and tree object context menus",()=>{
  if(!fs.existsSync(output)){
    execFileSync(process.execPath,["scripts/build-standalone.mjs"],{cwd:root});
  }
  const html=fs.readFileSync(output,"utf8");

  assert.match(html,/data-tubebender-bundled="object-selection-context-ui"/);
  assert.match(html,/id="tbObjectContextMenu"/);
  assert.match(html,/data-object-action="move"/);
  assert.match(html,/data-object-action="hide"/);
  assert.match(html,/data-object-action="show"/);
  assert.match(html,/data-object-action="transparent"/);
  assert.match(html,/data-object-action="delete"/);
  assert.match(html,/Переместить выбранные объекты/);
  assert.match(html,/source==="3d"/);
  assert.match(html,/source!=="3d"/);
  assert.match(html,/contextmenu/);
  assert.match(html,/event\.ctrlKey\|\|event\.metaKey/);
  assert.match(html,/translation_mm/);
  assert.match(html,/moveSelection/);
  assert.match(html,/uiHiddenIn3D/);
  assert.match(html,/uiTransparentIn3D/);
  assert.match(html,/tb-object-selected/);
  assert.match(html,/Box3Helper/);
  assert.match(html,/Прямой участок удаляется только вместе с предыдущим гибом/);
});


test("A49: standalone preserves VC207R7 flex header and clamps Project/Tube dropdowns",()=>{
  if(!fs.existsSync(output)){
    execFileSync(process.execPath,["scripts/build-standalone.mjs"],{cwd:root});
  }
  const html=fs.readFileSync(output,"utf8");

  assert.match(html,/data-tubebender-bundled="project-tube-bar-layout-fix"/);
  assert.match(html,/preserve the native \.tb-map-header flex layout/);
  assert.match(html,/body\.tb-project-map \.tb-map-header\{[\s\S]*min-width:0!important/);
  assert.match(html,/body\.tb-project-map #projectEditor\{[\s\S]*order:0!important/);
  assert.match(html,/@media \(min-width:1121px\) and \(max-width:1240px\)\{[\s\S]*\.tb-brand\{[\s\S]*flex:0 0 53px!important[\s\S]*\.tb-brand-text\{[\s\S]*display:none!important/);
  assert.match(html,/@media \(min-width:1121px\) and \(max-width:1550px\)\{[\s\S]*project-group,[\s\S]*tube-group\{[\s\S]*flex:1 1 0!important/);
  assert.doesNotMatch(html,/body\.tb-project-map \.tb-brand\{grid-column:/);
  assert.doesNotMatch(html,/body\.tb-project-map #projectEditor\{grid-column:/);
  assert.doesNotMatch(html,/body\.tb-project-map \.tb-window-controls\{[\s\S]*grid-column:/);

  assert.match(html,/body\.tb-project-map #tubeDropdown[\s\S]*position:fixed!important/);
  assert.match(html,/max-width:calc\(100vw - 16px\)!important/);
  assert.match(html,/function positionPopup\(id\)/);
  assert.match(html,/qs\('tubeCombo'\)\?\.addEventListener\('click',\(\)=>ptTogglePopup\('tubeDropdown'/);
  assert.match(html,/function ptRenderTubeDropdown\(\)/);
  assert.match(html,/p\.tubes\.forEach\(t=>/);
  assert.match(html,/row\.innerHTML=ptTubeHtml\(t,true\)/);
  assert.match(html,/const left=clamp\(rect\.left,margin,viewportWidth-width-margin\)/);
  assert.match(html,/below\+measuredHeight<=viewportHeight-margin/);
  assert.match(html,/rowCount:tube\.querySelectorAll/);
  assert.match(html,/brandProject:overlaps\(brand,editor\)/);
  assert.match(html,/projectActions:overlaps\(editor,actions\)/);
  assert.match(html,/actionsWindow:overlaps\(actions,controls\)/);
  assert.match(html,/windowChecks:overlaps\(controls,checksHead\)/);
});


test("A50: 3D component selection preserves the current viewer framing",()=>{
  if(!fs.existsSync(output)){
    execFileSync(process.execPath,["scripts/build-standalone.mjs"],{cwd:root});
  }
  const html=fs.readFileSync(output,"utf8");

  assert.match(html,/let preserveViewerFrameForCanvasInteraction=false/);
  assert.match(html,/function onCanvasClick\(event\)\{\s*preserveViewerFrameForCanvasInteraction=true/);
  assert.match(html,/queueMicrotask\(\(\)=>\{preserveViewerFrameForCanvasInteraction=false;\}\)/);
  assert.match(
    html,
    /safeUiCall\('renderViewerOnly', \(\)=>renderViewerOnly\(!preserveViewerFrameForCanvasInteraction\)\)/
  );
});


test("A51: window controls are repaired into the final top header and stay last",()=>{
  if(!fs.existsSync(output)){
    execFileSync(process.execPath,["scripts/build-standalone.mjs"],{cwd:root});
  }
  const html=fs.readFileSync(output,"utf8");

  assert.match(html,/\.tb-map-header\{height:var\(--r7-head\)!important/);
  assert.match(html,/\.tb-window-controls\{display:flex;gap:4px;align-items:center/);
  assert.match(html,/\.tb-window-control\{width:38px;height:38px/);
  assert.match(html,/@media \(max-width:1120px\)\{[\s\S]*\.tb-head-actions,\.tb-window-controls\{display:none!important\}/);

  assert.match(html,/let c=document\.getElementById\('tbWindowControls'\)/);
  assert.match(html,/if\(!c\)\{c=document\.createElement\('div'\)/);
  assert.match(html,/if\(c\.parentElement!==h\|\|h\.lastElementChild!==c\)h\.appendChild\(c\)/);

  assert.match(html,/body\.tb-project-map \.tb-brand\{order:10!important/);
  assert.match(html,/body\.tb-project-map #projectEditor\{order:20!important/);
  assert.match(html,/body\.tb-project-map \.tb-map-head-spacer\{order:30!important/);
  assert.match(html,/body\.tb-project-map \.tb-head-actions\{order:40!important/);
  assert.match(html,/body\.tb-project-map \.tb-window-controls\{[\s\S]*order:50!important[\s\S]*position:static!important/);

  const min=html.indexOf('id="tbWinMin"');
  const max=html.indexOf('id="tbWinMax"');
  const close=html.indexOf('id="tbWinClose"');
  assert.ok(min>=0&&max>min&&close>max);
});



test("A53: left drag orbits, middle drag pans, and right click remains for context menu",()=>{
  if(!fs.existsSync(output)){
    execFileSync(process.execPath,["scripts/build-standalone.mjs"],{cwd:root});
  }
  const html=fs.readFileSync(output,"utf8");

  assert.match(html,/if\(p\.button===0\)this\._mode='rotate'/);
  assert.match(html,/else if\(p\.button===1\)this\._mode='pan'/);
  assert.match(html,/else this\._mode='none'/);
  assert.match(html,/if\(p\.pointerType==='mouse'\)\{[\s\S]*if\(p\.button===0\)this\._mode='rotate'/);
  assert.match(html,/else if\(p\.button===1\)this\._mode='pan'/);
  assert.match(html,/if\(this\._mode==='pan'\)this\.pan\(dx,dy\)/);
  assert.match(html,/else if\(this\._mode==='rotate'\)\{[\s\S]*if\(p\.pointerType==='mouse'\)this\.rotate\(dx,-dy\)/);
  assert.match(html,/else this\.rotate\(dx,dy\)/);
  assert.match(html,/if\(remaining\.button===0\)this\._mode='rotate'/);
  assert.match(html,/else if\(remaining\.button===1\)this\._mode='pan'/);
  assert.match(html,/wheel\(e\)\{/);
  assert.doesNotMatch(html,/if\(p\.button===2\)this\._mode='rotate'/);
});


test("A56: editing one tube element grays the others without making any tube transparent",()=>{
  if(!fs.existsSync(output)){
    execFileSync(process.execPath,["scripts/build-standalone.mjs"],{cwd:root});
  }
  const html=fs.readFileSync(output,"utf8");

  assert.match(html,/function tubeElementOpacity\(rowIndex\)\{ return 1; \}/);
  assert.match(html,/function tubeElementDisplayColor\(baseColor,rowIndex\)/);
  assert.match(html,/return Number\(rowIndex\)===active \? 0xc77738 : 0x6f747b/);
  assert.match(html,/const editIsolation=!!selectedAssemblyId\|\|activeTubeEditRowIndex\(\)>=0/);
  assert.match(html,/const shownColor=invalid\?0xff3b30:\(editIsolation\?0x6f747b:0xc77738\)/);
  assert.match(html,/mat\.transparent = false/);
  assert.match(html,/mat\.opacity = 1/);
  assert.match(html,/mat\.depthWrite = true/);
});


test("A57: Project Map no longer renders the Editing area",()=>{
  if(!fs.existsSync(output)){
    execFileSync(process.execPath,["scripts/build-standalone.mjs"],{cwd:root});
  }
  const html=fs.readFileSync(output,"utf8");

  assert.doesNotMatch(html,/<section class="tb-card tb-map-edit">/);
  assert.doesNotMatch(html,/id="tbEditSummary"/);
  assert.doesNotMatch(html,/data-tab="edit"/);
  assert.match(html,/legacyWorkbenchHost\.id='tbLegacyWorkbenchHost'/);
  assert.match(html,/#tbLegacyWorkbenchHost\{display:none!important\}/);
  assert.match(
    html,
    /body\.tb-project-map \.tb-map-center\{grid-template-rows:minmax\(0,1fr\)!important;gap:0!important\}/
  );
});


test("A58: left-mouse upward drag rotates the model away from the user",()=>{
  if(!fs.existsSync(output)){
    execFileSync(process.execPath,["scripts/build-standalone.mjs"],{cwd:root});
  }
  const html=fs.readFileSync(output,"utf8");

  assert.match(
    html,
    /if\(p\.pointerType==='mouse'\)this\.rotate\(dx,-dy\)/
  );
  assert.match(
    html,
    /else this\.rotate\(dx,dy\)/
  );
});


test("A59: bend rotation editor rounds to the same two decimals as bend angle",()=>{
  if(!fs.existsSync(output)){
    execFileSync(process.execPath,["scripts/build-standalone.mjs"],{cwd:root});
  }
  const html=fs.readFileSync(output,"utf8");

  assert.match(html,/const sourceVal = evalFormula\(input\.value, NaN\)/);
  assert.match(html,/const val = Number\(sourceVal\.toFixed\(2\)\)/);
  assert.match(html,/row\.rotFormula = val\.toFixed\(2\)/);
  assert.match(html,/row\.rot = val/);
  assert.match(html,/input\.value = row\.rotFormula/);
});


test("A62: standalone applies active technology radii after DWFx recognition",()=>{
  if(!fs.existsSync(output)){
    execFileSync(process.execPath,["scripts/build-standalone.mjs"],{cwd:root});
  }
  const html=fs.readFileSync(output,"utf8");

  assert.match(html,/normalizeImportedProjectBendRadiiToTechnology/);
  assert.match(html,/technological_radius_normalized_count/);
  assert.match(html,/technological_radius_changed_count/);
  assert.match(html,/technological_radius_unresolved_count/);
  assert.match(html,/technological_radius_blocked_count/);
  assert.match(html,/od_tolerance_mm:0\.02/);
});


test("A63: invalid tube elements are red in text UI and 3D",()=>{
  if(!fs.existsSync(output)){
    execFileSync(process.execPath,["scripts/build-standalone.mjs"],{cwd:root});
  }
  const html=fs.readFileSync(output,"utf8");

  assert.match(html,/function tubeRowValidationIssues\(tube,rowIndex\)/);
  assert.match(html,/function tubeRowIsInvalid\(rowIndex,tube=activeTube\(\)\)/);
  assert.match(html,/Внутренний прямой участок короче Lmin/);
  assert.match(html,/Некорректный угол гиба/);
  assert.match(html,/Некорректный радиус гиба/);
  assert.match(html,/не соответствует технологическому R/);
  assert.match(html,/Элемент нарушает габаритную рамку или зазор 5 мм/);
  assert.match(html,/Элемент участвует в пересечении/);

  assert.match(html,/const invalid = tubeRowIsInvalid\(rowIndex,activeTube\(\)\)/);
  assert.match(html,/const displayColor=invalid\?0xff3b30:tubeElementDisplayColor/);
  assert.match(html,/passiveTubeMaterial\(color=PASSIVE_TUBE_COLOR,opacity=PASSIVE_TUBE_OPACITY,invalid=false\)/);
  assert.match(html,/tubeRowIsInvalid\(rowIndex,tube\)/);

  assert.match(html,/tb-invalid-tube-element/);
  assert.match(html,/color:#ff4c4c!important/);
  assert.match(html,/invalidIssues=tubeRowValidationIssues\(activeTube\(\),rowIndex\)/);
  assert.match(html,/\[data-tree-row\],\[data-tree-assembly-part\]/);
});


test("A64: project TreeView shows green or red circular tube status indicators",()=>{
  if(!fs.existsSync(output)){
    execFileSync(process.execPath,["scripts/build-standalone.mjs"],{cwd:root});
  }
  const html=fs.readFileSync(output,"utf8");

  assert.match(html,/function tubeValidationSummary\(tube\)/);
  assert.match(html,/tb-tube-status-dot/);
  assert.match(html,/\.tb-tube-status-dot\.ok\{background:#43d36b/);
  assert.match(html,/\.tb-tube-status-dot\.problem\{background:#ff4c4c/);
  assert.match(html,/dot\.className='tb-tube-status-dot '\+\(summary\.valid\?'ok':'problem'\)/);
  assert.match(html,/dot\.dataset\.tubeStatus=summary\.valid\?'ok':'problem'/);
  assert.match(html,/Все элементы трубы корректны/);
  assert.match(html,/Проблемных элементов: /);
  assert.match(html,/if\(label\)n\.insertBefore\(dot,label\)/);
});


test("A65: short start and end straights use removable technological allowances in the bending card",()=>{
  if(!fs.existsSync(output)){
    execFileSync(process.execPath,["scripts/build-standalone.mjs"],{cwd:root});
  }
  const html=fs.readFileSync(output,"utf8");

  assert.match(html,/function straightRowIndexes\(rows\)/);
  assert.match(html,/function isEndStraightRowIndex\(rows,rowIndex\)/);
  assert.match(html,/function technologicalEndAllowancePlan\(tube=activeTube\(\),options=\{\}\)/);
  assert.match(html,/startAllowance,endAllowance,totalAllowance:startAllowance\+endAllowance/);
  assert.match(html,/removableAfterBending:true/);
  assert.match(html,/nominalGeometryChanged:false/);

  assert.match(html,/const endpoint=rowIndex>=0&&isEndStraightRowIndex\(state\.rows\|\|\[\],rowIndex\)/);
  assert.match(html,/!isEndStraightRowIndex\(rows,rowIndex\).*Внутренний прямой участок короче Lmin/s);
  assert.match(html,/rows\.every\(\(r,index\)=>r\?\.type!=='LINE'\|\|isEndStraightRowIndex\(rows,index\)/);
  assert.match(html,/const endpoint=i===0\|\|i===lengths\.length-1/);

  assert.match(html,/endAllowances=technologicalEndAllowancePlan/);
  assert.match(html,/bendNo===1\?endAllowances\.startAllowance:0/);
  assert.match(html,/endAllowances\.totalAllowance/);
  assert.match(html,/return \{steps,theoretical,elongation:elong,production,massKg,areaMm2,style,machine,xyz,endAllowances\}/);

  assert.match(html,/id='engTechnologicalAllowance'/);
  assert.match(html,/Технологический припуск \(удалить после гибки\)/);
  assert.match(html,/Первый Y\/L в карте уже включает начальный припуск/);
  assert.match(html,/Номинальные размеры готовой детали не изменены/);
  assert.match(html,/Припуски карты гибки/);
});


test("A67: tube end is selectable and can be fixed as a persistent P2 constraint",()=>{
  if(!fs.existsSync(output)){
    execFileSync(process.execPath,["scripts/build-standalone.mjs"],{cwd:root});
  }
  const html=fs.readFileSync(output,"utf8");

  assert.match(html,/data-tree-end="1"/);
  assert.match(html,/Конец трубы/);
  assert.match(html,/tubeEnd=true/);
  assert.match(html,/addStaticLabel\('⚓'/);

  assert.match(html,/name:'P1',locked:true/);
  assert.match(html,/e\.ports\.P1\.locked=true/);
  assert.match(html,/Начальная точка всегда зафиксирована/);

  assert.match(html,/function captureFixedEndConstraint\(t=activeTube\(\)\)/);
  assert.match(html,/function enforceFixedEndConstraint\(guard\)/);
  assert.match(html,/function setEndConstraint\(tubeOrId,fixed=true\)/);
  assert.match(html,/fixedEndGuard:window\.TubeBenderEngineering\?\.captureFixedEndConstraint/);
  assert.match(html,/enforceFixedEndConstraint\?\.\(token\.fixedEndGuard\)/);
  assert.match(html,/зафиксированный конец трубы должен оставаться неподвижным/);
  assert.match(html,/нет свободного прямого участка для сохранения зафиксированного конца/);
  assert.match(html,/недостаточно степеней свободы для сохранения конца/);

  assert.match(html,/geometryForTube,captureFixedEndConstraint,enforceFixedEndConstraint,setEndConstraint/);
});


test("material library UI is bundled into standalone with domain module payload",()=>{
  if(!fs.existsSync(output)){
    execFileSync(process.execPath,["scripts/build-standalone.mjs"],{cwd:root});
  }
  const html=fs.readFileSync(output,"utf8");
  assert.match(html,/data-tubebender-bundled="material-library-ui"/);
  assert.match(html,/TubeBenderMaterials/);
  assert.match(html,/Material Library/);
  assert.match(html,/material_profile_id/);
  assert.match(html,/default_material_profile_id/);
  assert.match(html,/data:text\/javascript;base64,/);
  assert.doesNotMatch(html,/__TB_MATERIAL_MODULE_URL__/);
});


test("material profiles drive machine compensation without mutating nominal bend angles",()=>{
  if(!fs.existsSync(output)){
    execFileSync(process.execPath,["scripts/build-standalone.mjs"],{cwd:root});
  }
  const html=fs.readFileSync(output,"utf8");
  assert.match(html,/data-tubebender-bundled="material-manufacturing-bridge"/);
  assert.match(html,/materialBridge=window\.TubeBenderMaterialManufacturing/);
  assert.match(html,/materialCompensation=materialBridge\?\.compensateBend/);
  assert.match(html,/commandAngle=materialCompensation\.ok\?round\(materialCompensation\.commandAngleDeg,3\):null/);
  assert.match(html,/C:round\(angle,3\)/);
  assert.match(html,/materialCompensation/);
  assert.doesNotMatch(html,/commandAngle=round\(angle\+Math\.sign\(angle\|\|1\)\*n\(style\.springbackDeg\),3\)/);
  assert.match(html,/materialDensityKgM3=materialBridge\?\.densityKgM3/);
  assert.doesNotMatch(html,/massKg=areaMm2\*production\*1e-9\*n\(style\.densityKgM3,7850\)/);
});

test("production release and simulation block unresolved material technology",()=>{
  if(!fs.existsSync(output)){
    execFileSync(process.execPath,["scripts/build-standalone.mjs"],{cwd:root});
  }
  const html=fs.readFileSync(output,"utf8");
  assert.match(html,/materialGate=window\.TubeBenderMaterialManufacturing\?\.materialCheck/);
  assert.match(html,/Материал: \$\{issue\}/);
  assert.match(html,/materialSimulationGate=window\.TubeBenderMaterialManufacturing\?\.validateManufacturingData/);
  assert.match(html,/title:'Материал: '\+materialSimulationGate\.errors\[0\]/);
});

test("generic NC export performs parser-backed round-trip before download",()=>{
  if(!fs.existsSync(output)){
    execFileSync(process.execPath,["scripts/build-standalone.mjs"],{cwd:root});
  }
  const html=fs.readFileSync(output,"utf8");
  assert.match(html,/generic-ybc'\]=\{name:'Generic YBC',format:'YBC',parser:true/);
  assert.match(html,/generic-lra'\]=\{name:'Generic LRA',format:'LRA',parser:true/);
  assert.match(html,/validateManufacturingData\?\.\(\{project:activeProject\(\),tube:t,manufacturing:d,kind:'nc'\}\)/);
  assert.match(html,/roundTripValidate\?\.\(\{text:ncText,format:post\.format,expectedSteps:d\.steps\}\)/);
  assert.match(html,/NC round-trip проверка не пройдена/);
  assert.match(html,/material springback compensation is unresolved/);
});
