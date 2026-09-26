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
  `\n  try{\n    window.TubeBenderReferenceSceneUi?.bindTree?.(host,p,{switchTube,save,renderAll,refreshProjectTree});\n  }catch(error){\n    console.warn("DWFx reference tree binding:",error);\n  }`
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
      const recentPackage={...result.package,dwfxImport};
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
fs.writeFileSync(outputPath, output, "utf8");

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
