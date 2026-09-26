import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(
  root,
  "legacy",
  "VC207R7",
  "TubeBender_CAD_VC207R7_Pixel_Matched_Approved_Interface_Release.html"
);
const threePath = path.join(root, "vendor", "three", "r160", "three.min.js");
const dwfxEntryPath = path.join(root, "src", "import", "dwfx", "browser-file-import.mjs");
const dwfxCurrentProjectUiPath = path.join(root, "src", "import", "dwfx", "current-project-ui.js");
const dwfxReferenceSceneUiPath = path.join(root, "src", "import", "dwfx", "reference-scene-ui.js");
const distDir = path.join(root, "dist");
const outputPath = path.join(distDir, "TubeBender_CAD_VC207R7_M1_Standalone.html");

const source = fs.readFileSync(sourcePath, "utf8");
const three = fs.readFileSync(threePath, "utf8");

const localTag =
  '<script src="../../vendor/three/r160/three.min.js" data-tubebender-vendored="three-r160"></script>';

if (!source.includes(localTag)) {
  throw new Error("Vendored Three.js script tag was not found in the source HTML");
}

const moduleCache = new Map();
function moduleDataUrl(filePath, stack = new Set()) {
  const absolute = path.resolve(filePath);
  if (moduleCache.has(absolute)) return moduleCache.get(absolute);
  if (stack.has(absolute)) {
    throw new Error("Circular browser module dependency: " + path.relative(root, absolute));
  }

  const nextStack = new Set(stack);
  nextStack.add(absolute);
  let code = fs.readFileSync(absolute, "utf8");
  const dir = path.dirname(absolute);

  const replaceSpecifier = (_match, prefix, quote, specifier) => {
    if (!specifier.startsWith(".")) return _match;
    const resolved = path.resolve(dir, specifier);
    const url = moduleDataUrl(resolved, nextStack);
    return prefix + quote + url + quote;
  };

  code = code.replace(
    /(from\s+)(["'])(\.{1,2}\/[^"']+)\2/g,
    replaceSpecifier
  );
  code = code.replace(
    /(import\s+)(["'])(\.{1,2}\/[^"']+)\2/g,
    replaceSpecifier
  );

  const url =
    "data:text/javascript;base64," +
    Buffer.from(code, "utf8").toString("base64");
  moduleCache.set(absolute, url);
  return url;
}

function bundledEntrySource(filePath) {
  const absolute = path.resolve(filePath);
  let code = fs.readFileSync(absolute, "utf8");
  const dir = path.dirname(absolute);

  const replaceSpecifier = (_match, prefix, quote, specifier) => {
    if (!specifier.startsWith(".")) return _match;
    const resolved = path.resolve(dir, specifier);
    return prefix + quote + moduleDataUrl(resolved) + quote;
  };

  code = code.replace(
    /(from\s+)(["'])(\.{1,2}\/[^"']+)\2/g,
    replaceSpecifier
  );
  code = code.replace(
    /(import\s+)(["'])(\.{1,2}\/[^"']+)\2/g,
    replaceSpecifier
  );
  return code;
}

const safeThree = three.replace(/<\/script/gi, "<\\/script");
const bundledThree =
  `<script data-tubebender-bundled="three-r160">\n${safeThree}\n</script>`;

let output = source.replace(
  localTag,
  () => bundledThree
);

const importedToolingGuardSort =
  "  for(const t of allTubeRecords()){\n    if(!t.toolingId){\n      const legacy=pipeDb[Number(t.diameterIndex)];\n      if(legacy?.id)t.toolingId=legacy.id;\n    }\n  }";
if (!output.includes(importedToolingGuardSort)) {
  throw new Error("sortPipes tooling assignment loop was not found");
}
output = output.replace(
  importedToolingGuardSort,
  "  for(const t of allTubeRecords()){\n    const importBlocked=t?.importValidation?.productionBlocked===true;\n    if(!t.toolingId&&!importBlocked){\n      const legacy=pipeDb[Number(t.diameterIndex)];\n      if(legacy?.id)t.toolingId=legacy.id;\n    }\n  }"
);

const importedToolingGuardResync =
  "  for(const t of allTubeRecords()){\n    if(!t.toolingId){\n      const legacy=pipeDb[Number(t.diameterIndex)];\n      if(legacy?.id)t.toolingId=legacy.id;\n    }\n    const idx=toolingIndexById(t.toolingId);\n    if(idx>=0){\n      t.diameterIndex=idx;\n      t.toolingUnresolved=false;\n    }else if(t.toolingId){\n      t.toolingUnresolved=true;\n    }\n  }";
if (!output.includes(importedToolingGuardResync)) {
  throw new Error("resyncToolingReferences loop was not found");
}
output = output.replace(
  importedToolingGuardResync,
  "  for(const t of allTubeRecords()){\n    const importBlocked=t?.importValidation?.productionBlocked===true;\n    if(!t.toolingId&&!importBlocked){\n      const legacy=pipeDb[Number(t.diameterIndex)];\n      if(legacy?.id)t.toolingId=legacy.id;\n    }\n    if(!t.toolingId&&importBlocked){\n      t.toolingUnresolved=true;\n      continue;\n    }\n    const idx=toolingIndexById(t.toolingId);\n    if(idx>=0){\n      t.diameterIndex=idx;\n      t.toolingUnresolved=false;\n    }else if(t.toolingId){\n      t.toolingUnresolved=true;\n    }\n  }"
);

const bodyProfileCompatAnchor =
  "const oldNormalize=window.normalizeProjectCoordinateState;";
if (!output.includes(bodyProfileCompatAnchor)) {
  throw new Error("Project Map body-profile compatibility anchor was not found");
}
const bodyProfileCompat = `
function isCurrentBodyPreferred(){
  ensureBodyProfiles();
  const preferred=state.bodyProfiles.find(
    (profile)=>profile.id===state.preferredBodyProfileId
  );
  return !!preferred&&bodyKey(preferred)===bodyKey(currentBody());
}
function makeCurrentBodyPreferred(){
  ensureBodyProfiles();
  const body=currentBody();
  const key=bodyKey(body);
  let profile=state.bodyProfiles.find((item)=>bodyKey(item)===key);
  if(!profile){
    profile=normalizeProfile({
      id:"body-current-"+Date.now().toString(36),
      name:"Корпус "+fmt0(body.length)+" × "+fmt0(body.depth)+" × "+fmt0(body.height),
      ...body
    });
    state.bodyProfiles.push(profile);
  }
  state.preferredBodyProfileId=profile.id;
  try{save();}catch{}
  try{refreshProjectTree();}catch{}
  try{populateProfiles();}catch{}
  try{ptToast("Текущий корпус сохранён как предпочтительный");}catch{}
  return profile;
}
`;
output = output.replace(
  bodyProfileCompatAnchor,
  bodyProfileCompat + "\n" + bodyProfileCompatAnchor
);

const inspectionCssAnchor =
  ".po-report-details{font-size:10px;color:#8fa1b7;margin-left:24px;margin-top:2px}";
if (!output.includes(inspectionCssAnchor)) {
  throw new Error("Project-open inspection CSS anchor was not found");
}
output = output.replace(
  inspectionCssAnchor,
  inspectionCssAnchor +
  ".po-inspection-head{display:flex;align-items:center;gap:7px;margin:4px 2px 7px}.po-inspection-head .po-inspection-title{margin:0;flex:1}.po-inspection-toggle{width:24px;height:22px;border:1px solid #3a4a62;border-radius:5px;background:#1b293d;color:#cbd7e8;cursor:pointer;font-size:12px;font-weight:900;line-height:18px}.po-inspection-toggle:hover{background:#263a56;border-color:#5f7ea6}.po-inspection-summary{font-size:9px;color:#8fa1b7;white-space:nowrap}.po-inspection-body.collapsed{display:none}"
);

const inspectionFunctionAnchor = "function poRenderInspection(){";
if (!output.includes(inspectionFunctionAnchor)) {
  throw new Error("poRenderInspection anchor was not found");
}
const inspectionHelpers = `
const PO_INSPECTION_COLLAPSE_KEY='tubebender.poInspectionCollapsed';
let poInspectionCollapsed=(()=>{
  try{return localStorage.getItem(PO_INSPECTION_COLLAPSE_KEY)==='1';}
  catch{return false;}
})();
function poSetInspectionCollapsed(value){
  poInspectionCollapsed=!!value;
  try{localStorage.setItem(PO_INSPECTION_COLLAPSE_KEY,poInspectionCollapsed?'1':'0');}catch{}
}
function poInspectionHeader(pkg=null){
  const errorCount=Number(pkg?.errors?.length)||0;
  const warnCount=Number(pkg?.warnings?.length)||0;
  const issueText=errorCount
    ? 'Ошибок: '+errorCount
    : warnCount
      ? 'Предупреждений: '+warnCount
      : 'Ошибок: 0';
  return '<div class="po-inspection-head">'+
    '<div class="po-inspection-title">Проверка файла</div>'+
    '<span class="po-inspection-summary">'+poEsc(issueText)+'</span>'+
    '<button type="button" class="po-inspection-toggle" id="poInspectionToggle" '+
    'title="'+(poInspectionCollapsed?'Развернуть панель ошибок':'Свернуть панель ошибок')+'" '+
    'aria-expanded="'+(!poInspectionCollapsed)+'">'+
    (poInspectionCollapsed?'▸':'▾')+
    '</button></div>';
}
function poBindInspectionToggle(){
  const button=qs('poInspectionToggle');
  if(!button)return;
  button.onclick=()=>{
    poSetInspectionCollapsed(!poInspectionCollapsed);
    poRenderInspection();
  };
}
`;
output = output.replace(
  inspectionFunctionAnchor,
  inspectionHelpers + "\n" + inspectionFunctionAnchor
);

const oldInspectionBody =
  "box.innerHTML='<div class=\"po-inspection-title\">Проверка файла</div>'+checks.map(c=>`<div class=\"po-check ${c.level}\"><span>${c.level==='ok'?'✓':c.level==='warn'?'⚠':'×'}</span><span>${poEsc(c.text)}</span></div>`).join('')+(pkg.errors.length?`<div class=\"po-report-details\">${pkg.errors.map(poEsc).join('<br>')}</div>`:'')+(pkg.warnings.length?`<div class=\"po-report-details\">${pkg.warnings.slice(0,12).map(poEsc).join('<br>')}${pkg.warnings.length>12?'<br>…':''}</div>`:'')+(pkg.conversions.length?`<div class=\"po-report-details\"><b>Преобразования:</b><br>${[...new Set(pkg.conversions)].map(poEsc).join('<br>')}</div>`:'');}";
if (!output.includes(oldInspectionBody)) {
  throw new Error("poRenderInspection body was not found");
}
const newInspectionBody =
  "box.innerHTML=poInspectionHeader(pkg)+'<div class=\"po-inspection-body'+(poInspectionCollapsed?' collapsed':'')+'\">'+checks.map(c=>`<div class=\"po-check ${c.level}\"><span>${c.level==='ok'?'✓':c.level==='warn'?'⚠':'×'}</span><span>${poEsc(c.text)}</span></div>`).join('')+(pkg.errors.length?`<div class=\"po-report-details\">${pkg.errors.map(poEsc).join('<br>')}</div>`:'')+(pkg.warnings.length?`<div class=\"po-report-details\">${pkg.warnings.slice(0,12).map(poEsc).join('<br>')}${pkg.warnings.length>12?'<br>…':''}</div>`:'')+(pkg.conversions.length?`<div class=\"po-report-details\"><b>Преобразования:</b><br>${[...new Set(pkg.conversions)].map(poEsc).join('<br>')}</div>`:'')+'</div>';poBindInspectionToggle();}";
output = output.replace(oldInspectionBody,newInspectionBody);

const oldInspectionEmpty =
  "function poRenderInspectionEmpty(){if(PO.current)return;qs('poSummaryGrid').innerHTML='';qs('poInspection').innerHTML='<div class=\"po-inspection-title\">Проверка файла</div><div class=\"po-check\"><span>○</span><span>Файл ещё не выбран.</span></div>';qs('poOpenBtn').disabled=true;qs('poPreviewPlaceholder')?.classList.remove('hidden');}";
if (!output.includes(oldInspectionEmpty)) {
  throw new Error("poRenderInspectionEmpty implementation was not found");
}
const newInspectionEmpty =
  "function poRenderInspectionEmpty(){if(PO.current)return;qs('poSummaryGrid').innerHTML='';qs('poInspection').innerHTML=poInspectionHeader(null)+'<div class=\"po-inspection-body'+(poInspectionCollapsed?' collapsed':'')+'\"><div class=\"po-check\"><span>○</span><span>Файл ещё не выбран.</span></div></div>';poBindInspectionToggle();qs('poOpenBtn').disabled=true;qs('poPreviewPlaceholder')?.classList.remove('hidden');}";
output = output.replace(oldInspectionEmpty,newInspectionEmpty);

const boundsOverlayCssAnchor =
  ".bounds-warning-actions button:hover{background:#3a4963!important;border-color:#9bb8dc!important}";
if (!output.includes(boundsOverlayCssAnchor)) {
  throw new Error("3D bounds-warning CSS anchor was not found");
}
output = output.replace(
  boundsOverlayCssAnchor,
  boundsOverlayCssAnchor +
  ".bounds-warning-collapse{width:26px!important;height:26px!important;min-width:26px!important;padding:0!important;border:1px solid rgba(255,255,255,.28)!important;border-radius:6px!important;background:#2a3448!important;color:#fff!important;cursor:pointer!important;font:950 15px/1 Segoe UI,Arial,sans-serif!important;flex:0 0 auto}.bounds-warning-collapse:hover{background:#3a4963!important;border-color:#9bb8dc!important}.bounds-warning-summary{display:none;font:900 11px/1.2 Segoe UI,Arial,sans-serif;white-space:nowrap}.bounds-warning.collapsed{width:auto!important;max-width:calc(100% - 24px)!important;min-width:0!important;padding:5px 7px!important;gap:7px!important}.bounds-warning.collapsed .bounds-warning-text,.bounds-warning.collapsed .bounds-warning-actions{display:none!important}.bounds-warning.collapsed .bounds-warning-summary{display:inline!important}.bounds-warning.collapsed .bounds-warning-main{gap:5px!important}.bounds-warning.collapsed .bounds-warning-icon{font-size:15px!important}"
);

const oldBoundsOverlayHtml = `<div aria-live="polite" class="bounds-warning hidden" id="boundsWarning" role="alert">
<div class="bounds-warning-main"><span class="bounds-warning-icon">⚠</span><span class="bounds-warning-text" id="boundsWarningText"></span></div>
<div class="bounds-warning-actions">
<button id="boundsFocusBtn" type="button">К первому нарушению</button>
<button id="boundsEditBtn" type="button">Исправить вручную</button>
</div>
</div>`;
if (!output.includes(oldBoundsOverlayHtml)) {
  throw new Error("3D bounds-warning HTML block was not found");
}
const newBoundsOverlayHtml = `<div aria-live="polite" class="bounds-warning hidden" id="boundsWarning" role="alert">
<div class="bounds-warning-main"><span class="bounds-warning-icon">⚠</span><span class="bounds-warning-summary" id="boundsWarningSummary"></span><span class="bounds-warning-text" id="boundsWarningText"></span></div>
<div class="bounds-warning-actions">
<button id="boundsFocusBtn" type="button">К первому нарушению</button>
<button id="boundsEditBtn" type="button">Исправить вручную</button>
</div>
<button class="bounds-warning-collapse" id="boundsCollapseBtn" type="button" title="Свернуть окно ошибок" aria-expanded="true">−</button>
</div>`;
output = output.replace(oldBoundsOverlayHtml,newBoundsOverlayHtml);

const boundsRenderAnchor = "function renderBoundsWarning(){";
if (!output.includes(boundsRenderAnchor)) {
  throw new Error("renderBoundsWarning anchor was not found");
}
const boundsOverlayHelpers = `
const BOUNDS_WARNING_COLLAPSE_KEY='tubebender.boundsWarningCollapsed';
let boundsWarningCollapsed=(()=>{
  try{return localStorage.getItem(BOUNDS_WARNING_COLLAPSE_KEY)==='1';}
  catch{return false;}
})();
function setBoundsWarningCollapsed(value){
  boundsWarningCollapsed=!!value;
  try{localStorage.setItem(BOUNDS_WARNING_COLLAPSE_KEY,boundsWarningCollapsed?'1':'0');}catch{}
  const box=qs('boundsWarning');
  const button=qs('boundsCollapseBtn');
  box?.classList.toggle('collapsed',boundsWarningCollapsed);
  if(button){
    button.textContent=boundsWarningCollapsed?'▸':'−';
    button.title=boundsWarningCollapsed?'Развернуть окно ошибок':'Свернуть окно ошибок';
    button.setAttribute('aria-expanded',String(!boundsWarningCollapsed));
  }
}
function updateBoundsWarningCollapseUi(){
  const box=qs('boundsWarning');
  const button=qs('boundsCollapseBtn');
  box?.classList.toggle('collapsed',boundsWarningCollapsed);
  if(button){
    button.textContent=boundsWarningCollapsed?'▸':'−';
    button.title=boundsWarningCollapsed?'Развернуть окно ошибок':'Свернуть окно ошибок';
    button.setAttribute('aria-expanded',String(!boundsWarningCollapsed));
  }
}
`;
output = output.replace(
  boundsRenderAnchor,
  boundsOverlayHelpers + "\n" + boundsRenderAnchor
);

const oldBoundsTextLine = `  text.textContent=messages.join(' ');
  box.classList.remove('hidden');
  box.dataset.hasCollision=collisions.valid?'false':'true';`;
if (!output.includes(oldBoundsTextLine)) {
  throw new Error("renderBoundsWarning message block was not found");
}
const newBoundsTextLine = `  text.textContent=messages.join(' ');
  const summary=qs('boundsWarningSummary');
  const issueCount=(technological?1:0)+(Number(a.violationCount)||0)+(Number(collisions.count)||0);
  if(summary)summary.textContent='Нарушений: '+issueCount;
  box.classList.remove('hidden');
  box.dataset.hasCollision=collisions.valid?'false':'true';
  updateBoundsWarningCollapseUi();`;
output = output.replace(oldBoundsTextLine,newBoundsTextLine);

const oldBoundsBind = `function bind(){
  qs('boundsFocusBtn')?.addEventListener('click',()=>focusBoundsViolation(false));
  qs('boundsEditBtn')?.addEventListener('click',()=>focusBoundsViolation(true));`;
if (!output.includes(oldBoundsBind)) {
  throw new Error("bounds-warning bind block was not found");
}
const newBoundsBind = `function bind(){
  qs('boundsFocusBtn')?.addEventListener('click',()=>focusBoundsViolation(false));
  qs('boundsEditBtn')?.addEventListener('click',()=>focusBoundsViolation(true));
  qs('boundsCollapseBtn')?.addEventListener('click',()=>setBoundsWarningCollapsed(!boundsWarningCollapsed));`;
output = output.replace(oldBoundsBind,newBoundsBind);

const referenceDisposeAnchor =
  "  root.traverse?.(obj=>{\n    if (obj.geometry?.dispose) geometries.add(obj.geometry);";
if (!output.includes(referenceDisposeAnchor)) {
  throw new Error("disposeObject3D reference-geometry anchor was not found");
}
output = output.replace(
  referenceDisposeAnchor,
  "  root.traverse?.(obj=>{\n    if(obj.userData?.referenceShared===true)return;\n    if (obj.geometry?.dispose) geometries.add(obj.geometry);"
);

const referenceRenderAnchor =
  "  addOtherVisibleProjectTubes(pipeGroup);";
if (!output.includes(referenceRenderAnchor)) {
  throw new Error("update3D reference-geometry anchor was not found");
}
output = output.replace(
  referenceRenderAnchor,
  referenceRenderAnchor +
  `\n  try{\n    window.TubeBenderReferenceSceneUi?.render3D?.({\n      parent:pipeGroup,\n      project:activeProject(),\n      THREE:window.THREE,\n      geomScale:GEOM_SCALE\n    });\n  }catch(error){\n    console.warn("DWFx reference geometry render:",error);\n  }`
);

const referenceTreeHtmlAnchor =
  "  host.innerHTML=items.join('');";
if (!output.includes(referenceTreeHtmlAnchor)) {
  throw new Error("Project Map reference-tree HTML anchor was not found");
}
output = output.replace(
  referenceTreeHtmlAnchor,
  `  try{\n    const referenceItems=window.TubeBenderReferenceSceneUi?.treeItems?.({\n      project:p,\n      query:q,\n      escape:esc\n    })??[];\n    items.push(...referenceItems);\n  }catch(error){\n    console.warn("DWFx reference tree:",error);\n  }\n` +
  referenceTreeHtmlAnchor
);

const referenceTreeBindAnchor =
  "  host.querySelector('#tbCurrentBodyStar')?.addEventListener('click',e=>{e.stopPropagation();makeCurrentBodyPreferred();});";
if (!output.includes(referenceTreeBindAnchor)) {
  throw new Error("Project Map reference-tree binding anchor was not found");
}
output = output.replace(
  referenceTreeBindAnchor,
  referenceTreeBindAnchor +
  `\n  try{\n    window.TubeBenderReferenceSceneUi?.bindTree?.(host,p,{
      switchTube,
      save,
      renderAll,
      refreshProjectTree,
      modelCommand:tbModelCommand
    });\n  }catch(error){\n    console.warn("DWFx reference tree binding:",error);\n  }`
);

const dwfxEntryUrl = moduleDataUrl(dwfxEntryPath);
const bundledDwfx =
  `<script type="application/octet-stream" id="tbDwfxLazyModuleUrl" data-tubebender-bundled="dwfx-import">\n${dwfxEntryUrl}\n</script>
<script data-tubebender-bundled="dwfx-lazy-bootstrap">
(()=>{let modulePromise=null;
const loadDwfxModule=()=>{
  if(!modulePromise){
    const holder=document.getElementById("tbDwfxLazyModuleUrl");
    const url=String(holder?.textContent??"").trim();
    if(!url.startsWith("data:text/javascript;base64,")){
      return Promise.reject(new Error("Bundled DWFx module payload is missing"));
    }
    modulePromise=import(url);
  }
  return modulePromise;
};
window.TubeBenderDwfxImport=Object.freeze({
  importSelectedDwfxFile:async(...args)=>(await loadDwfxModule()).importSelectedDwfxFile(...args),
  mergeDwfxTubesIntoCurrentProject:async(...args)=>(await loadDwfxModule()).mergeDwfxTubesIntoCurrentProject(...args),
  normalizeImportedProjectDiameters:async(...args)=>(await loadDwfxModule()).normalizeImportedProjectDiameters(...args),
  preload:loadDwfxModule
});
const tbDwfxInput=document.getElementById("poFileInput");
if(tbDwfxInput)tbDwfxInput.setAttribute("accept",".json,.dwfx,application/json,application/octet-stream");
})();\n</script>`;

const dwfxCurrentProjectUi = fs.readFileSync(dwfxCurrentProjectUiPath, "utf8").replace(/<\/script/gi, "<\\/script");
const bundledDwfxCurrentProjectUi =
  `<script data-tubebender-bundled="dwfx-current-project-ui">\n${dwfxCurrentProjectUi}\n</script>`;

const dwfxReferenceSceneUi = fs.readFileSync(dwfxReferenceSceneUiPath, "utf8").replace(/<\/script/gi, "<\\/script");
const bundledDwfxReferenceSceneUi =
  `<script data-tubebender-bundled="dwfx-reference-scene-ui">\n${dwfxReferenceSceneUi}\n</script>`;

if (!output.includes("</body>")) {
  throw new Error("Standalone source HTML is missing </body>");
}
const finalBodyCloseIndex = output.lastIndexOf("</body>");
if (finalBodyCloseIndex < 0) {
  throw new Error("Standalone source HTML is missing the final </body>");
}
output =
  output.slice(0, finalBodyCloseIndex) +
  bundledDwfx +
  "\n" +
  bundledDwfxReferenceSceneUi +
  "\n" +
  bundledDwfxCurrentProjectUi +
  "\n" +
  output.slice(finalBodyCloseIndex);

const oldPoLoadFile =
  "async function poLoadFile(file){if(!file)return;PO.source='device';poUpdateSourceUi();const token=++PO.analysisToken;poSetBusy(true,\`Чтение \${file.name}…\`);try{const raw=await file.text();if(token!==PO.analysisToken)return;await poLoadRawText(raw,{name:file.name,size:file.size,modified:file.lastModified||Date.now(),source:'device'});}catch(e){poSetBusy(false,'Не удалось прочитать файл');ptToast('Не удалось прочитать файл');}}";

if (!output.includes(oldPoLoadFile)) {
  throw new Error("Current poLoadFile implementation was not found for guarded DWFx integration");
}

const newPoLoadFile = `async function poLoadFile(file){
  if(!file)return;
  PO.source='device';
  poUpdateSourceUi();
  const token=++PO.analysisToken;
  poSetBusy(true,\`Чтение \${file.name}…\`);
  try{
    if(/\\.dwfx$/i.test(String(file.name||''))){
      const bridge=window.TubeBenderDwfxImport;
      if(!bridge||typeof bridge.importSelectedDwfxFile!=='function'){
        throw new Error('DWFx importer module is not ready');
      }
      let result=await bridge.importSelectedDwfxFile(file);
      if(token!==PO.analysisToken)return;
      if(result?.reference_scene_runtime){
        window.TubeBenderReferenceSceneUi?.registerRuntime?.(
          result.reference_scene_runtime
        );
      }
      if(result?.status==='requirements_pending'&&result?.requirement?.kind==='bbox'){
        const explicitBBox={};
        let bboxCancelled=false;
        for(const axis of ['x','y','z']){
          const rawValue=window.prompt('Введите размер корпуса '+axis.toUpperCase()+' (мм):','');
          if(rawValue===null){bboxCancelled=true;break;}
          const value=Number(String(rawValue).trim().replace(',','.'));
          if(!Number.isFinite(value)||value<=0){
            ptToast('Размер корпуса должен быть положительным числом');
            bboxCancelled=true;
            break;
          }
          explicitBBox[axis]=value;
        }
        if(!bboxCancelled){
          result=await bridge.importSelectedDwfxFile(file,{bbox:explicitBBox});
          if(token!==PO.analysisToken)return;
          if(result?.reference_scene_runtime){
            window.TubeBenderReferenceSceneUi?.registerRuntime?.(
              result.reference_scene_runtime
            );
          }
        }
      }
      if(result?.status!=='dwfx_project_candidate'||!result.package){
        const reason=result?.blocker||'DWFx import is blocked.';
        PO.current={
          meta:{name:file.name,size:file.size||0,modified:file.lastModified||Date.now(),source:'device'},
          projects:[],
          pipeDb:clone(pipeDb),
          version:'—',
          warnings:[],
          errors:[reason],
          conversions:[],
          status:'error',
          summary:{projects:0,tubes:0,length:0,hidden:0,bends:0,collisions:0},
          collisions:[],
          rawDwfxImport:result||null
        };
        PO.currentRecord=null;
        poSetBusy(false,'DWFx · импорт заблокирован');
        poRenderPackage();
        return;
      }
      const meta={name:file.name,size:file.size||0,modified:file.lastModified||Date.now(),source:'device'};
      const dwfxImport={
        status:result.status,
        stage:result.stage,
        source_file:result.source_file,
        production_ready:false
      };
      let normalizedPackage=result.package;
      if(
        result.package?.project &&
        typeof bridge.normalizeImportedProjectDiameters==='function'
      ){
        const normalized=await bridge.normalizeImportedProjectDiameters(
          result.package.project,
          Array.isArray(pipeDb)?pipeDb:[],
          {recommended_tolerance_mm:0.35}
        );
        normalizedPackage={...result.package,project:normalized.project};
        dwfxImport.diameter_normalized_count=normalized.normalized_count;
        dwfxImport.diameter_large_deviation_count=normalized.large_deviation_count;
      }
      const recentPackage={...normalizedPackage,dwfxImport};
      const pkg=poNormalizePackage(recentPackage,meta);
      pkg.rawData=recentPackage;
      pkg.rawText=JSON.stringify(recentPackage);
      pkg.rawDwfxImport=dwfxImport;
      PO.current=pkg;
      PO.currentRecord=null;
      poResetSelection(pkg);
      poSetBusy(false,String(file.name||'Файл')+' · DWFx анализ завершён');
      poRenderPackage();
      return;
    }
    const raw=await file.text();
    if(token!==PO.analysisToken)return;
    await poLoadRawText(raw,{name:file.name,size:file.size,modified:file.lastModified||Date.now(),source:'device'});
  }catch(e){
    poSetBusy(false,'Не удалось прочитать файл');
    ptToast('Не удалось прочитать файл');
  }
}`;

output = output.replace(oldPoLoadFile, newPoLoadFile);

output = output.replaceAll(
  "[...(e.dataTransfer?.files||[])].find(x=>/\\.json$/i.test(x.name)||x.type.includes('json'))",
  "[...(e.dataTransfer?.files||[])].find(x=>/\\.(?:json|dwfx)$/i.test(x.name)||x.type.includes('json'))"
);
output = output.replaceAll(
  "Нужен JSON-файл проекта",
  "Нужен JSON- или DWFx-файл проекта"
);
output = output.replaceAll(
  "перетащите JSON-файл проекта",
  "перетащите JSON/DWFx-файл проекта"
);

output = output.replace(
  "offlineCoreReady:true,\n  offlineReady:false",
  "offlineCoreReady:true,\n  offlineReady:false"
);

if (/cdn\.jsdelivr\.net\/npm\/three@/i.test(output)) {
  throw new Error("Standalone build still references the Three.js CDN");
}
if (/<script\b[^>]*\bsrc=["'][^"']*three[^"']*["'][^>]*>/i.test(output)) {
  throw new Error("Standalone build still contains an external Three.js script tag");
}
if (!output.includes('data-tubebender-bundled="three-r160"')) {
  throw new Error("Standalone build is missing the bundled Three.js marker");
}
if (!output.includes('data-tubebender-bundled="dwfx-import"')) {
  throw new Error("Standalone build is missing the bundled DWFx importer marker");
}
if (!output.includes('data-tubebender-bundled="dwfx-current-project-ui"')) {
  throw new Error("Standalone build is missing the current-project DWFx UI marker");
}
if (!output.includes('data-tubebender-bundled="dwfx-reference-scene-ui"')) {
  throw new Error("Standalone build is missing the DWFx reference-scene UI marker");
}
if (!output.includes("TubeBenderReferenceSceneUi") || !output.includes("referenceShared")) {
  throw new Error("Standalone build is missing read-only DWFx reference rendering hooks");
}
if (!output.includes('data-tubebender-bundled="dwfx-lazy-bootstrap"') || !output.includes("loadDwfxModule")) {
  throw new Error("Standalone build does not expose the lazy DWFx browser controller");
}
if (output.includes('<script type="module" data-tubebender-bundled="dwfx-import"')) {
  throw new Error("DWFx module must not execute during initial standalone page load");
}
if (!output.includes("result?.status!=='dwfx_project_candidate'")) {
  throw new Error("Standalone project-open path is missing the guarded DWFx branch");
}
if (!output.includes("poImportCurrentBtn") || !output.includes("importSelectedDwfxTubesIntoCurrentProject")) {
  throw new Error("Standalone build is missing the current-project DWFx import control");
}

fs.mkdirSync(distDir, { recursive: true });
const tempOutputPath =
  outputPath + ".tmp-" + process.pid + "-" + Date.now().toString(36);
fs.writeFileSync(tempOutputPath, output, "utf8");
fs.renameSync(tempOutputPath, outputPath);

const bytes = fs.statSync(outputPath).size;
process.stdout.write(
  JSON.stringify(
    {
      output: path.relative(root, outputPath),
      bytes,
      offlineCoreReady: true,
      bundledDwfxImporter: true,
      currentProjectDwfxImport: true,
      injectedAtFinalBodyClose: true,
      lazyDwfxRuntime: true,
      optionalExternalModules: ["tesseract"]
    },
    null,
    2
  ) + "\n"
);
