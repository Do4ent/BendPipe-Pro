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

const dwfxEntry = bundledEntrySource(dwfxEntryPath).replace(
  /<\/script/gi,
  "<\\/script"
);
const bundledDwfx =
  `<script type="module" data-tubebender-bundled="dwfx-import">\n${dwfxEntry}\nwindow.TubeBenderDwfxImport=Object.freeze({importSelectedDwfxFile,mergeDwfxTubesIntoCurrentProject});\nconst tbDwfxInput=document.getElementById("poFileInput");if(tbDwfxInput)tbDwfxInput.setAttribute("accept",".json,.dwfx,application/json,application/octet-stream");\n</script>`;

const dwfxCurrentProjectUi = fs.readFileSync(dwfxCurrentProjectUiPath, "utf8").replace(/<\/script/gi, "<\\/script");
const bundledDwfxCurrentProjectUi =
  `<script data-tubebender-bundled="dwfx-current-project-ui">\n${dwfxCurrentProjectUi}\n</script>`;

if (!output.includes("</body>")) {
  throw new Error("Standalone source HTML is missing </body>");
}
output = output.replace("</body>", bundledDwfx + "\n" + bundledDwfxCurrentProjectUi + "\n</body>");

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
if (!output.includes("window.TubeBenderDwfxImport=Object.freeze({importSelectedDwfxFile,mergeDwfxTubesIntoCurrentProject})")) {
  throw new Error("Standalone build does not expose the DWFx browser controller and current-project merge helper");
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
      optionalExternalModules: ["tesseract"]
    },
    null,
    2
  ) + "\n"
);
