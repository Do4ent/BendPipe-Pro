import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderMobileViewportStyle } from "../src/ui/mobile-viewport.mjs";
import { createFrameCoalescer, runIsolatedStartup, scheduleInitialSceneAfterPaint } from "../src/domain/performance/render-startup.mjs";

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
const objectSelectionContextUiPath = path.join(root, "src", "ui", "object-selection-context-ui.js");
const projectTubeBarLayoutFixPath = path.join(root, "src", "ui", "project-tube-bar-layout-fix.js");
const materialLibraryUiPath = path.join(root, "src", "ui", "material-library-ui.js");
const materialManufacturingBridgePath = path.join(root, "src", "ui", "material-manufacturing-bridge.js");
const measurementsUiPath = path.join(root, "src", "ui", "measurements-ui.js");
const dimensionGripsRuntimePath = path.join(root, "src", "ui", "dimension-grips-runtime.js");
const editingUiPath = path.join(root, "src", "ui", "editing-ui.js");
const snapTrackingRuntimePath = path.join(root, "src", "ui", "snap-tracking-runtime.js");
const transformGizmoRuntimePath = path.join(root, "src", "ui", "transform-gizmo-runtime.js");
const geometryGripsRuntimePath = path.join(root, "src", "ui", "geometry-grips-runtime.js");
const screenSpaceDisplayRuntimePath = path.join(root, "src", "ui", "screen-space-display-runtime.js");
const interactionPriorityRuntimePath = path.join(root, "src", "ui", "interaction-priority-runtime.js");
const repeatCommandRuntimePath = path.join(root, "src", "ui", "repeat-command-runtime.js");
const hotkeysRuntimePath = path.join(root, "src", "ui", "hotkeys-runtime.js");
const commandPaletteRuntimePath = path.join(root, "src", "ui", "command-palette-runtime.js");
const selectionSetsRuntimePath = path.join(root, "src", "ui", "selection-sets-runtime.js");
const namedViewsRuntimePath = path.join(root, "src", "ui", "named-views-runtime.js");
const sectionViewRuntimePath = path.join(root, "src", "ui", "section-view-runtime.js");
const propertiesPanelRuntimePath = path.join(root, "src", "ui", "properties-panel-runtime.js");
const objectLockRuntimePath = path.join(root, "src", "ui", "object-lock-runtime.js");
const layersRuntimePath = path.join(root, "src", "ui", "layers-runtime.js");
const groupsRuntimePath = path.join(root, "src", "ui", "groups-runtime.js");
const assembliesRuntimePath = path.join(root, "src", "ui", "assemblies-runtime.js");
const constraintsRuntimePath = path.join(root, "src", "ui", "constraints-runtime.js");
const toleranceProfileRuntimePath = path.join(root, "src", "ui", "tolerance-profile-runtime.js");
const fittedGeometryRuntimePath = path.join(root, "src", "ui", "fitted-geometry-runtime.js");
const normalizeGeometryRuntimePath = path.join(root, "src", "ui", "normalize-geometry-runtime.js");
const deleteDependenciesRuntimePath = path.join(root, "src", "ui", "delete-dependencies-runtime.js");
const associativeArrayRuntimePath = path.join(root, "src", "ui", "associative-array-runtime.js");
const arrayGripsRuntimePath = path.join(root, "src", "ui", "array-grips-runtime.js");
const associativeMirrorRuntimePath = path.join(root, "src", "ui", "associative-mirror-runtime.js");
const transformStackRuntimePath = path.join(root, "src", "ui", "transform-stack-runtime.js");
const transformStackDomainPath = path.join(root, "src", "domain", "editing", "transform-stack.mjs");
const straightRunDomainPath = path.join(root, "src", "domain", "editing", "straight-run.mjs");
const legacyRigidTransformDomainPath = path.join(root, "src", "domain", "editing", "legacy-rigid-transform.mjs");
const dynamicInputDomainPath = path.join(root, "src", "domain", "editing", "dynamic-input.mjs");
const snapEngineDomainPath = path.join(root, "src", "domain", "snapping", "snap-engine.mjs");
const transformCommandsDomainPath = path.join(root, "src", "domain", "editing", "transform-commands.mjs");
const copyDependenciesDomainPath = path.join(root, "src", "domain", "editing", "copy-dependencies.mjs");
const objectLocksDomainPath = path.join(root, "src", "domain", "editing", "object-locks.mjs");
const repeatCommandDomainPath = path.join(root, "src", "domain", "editing", "repeat-command.mjs");
const hotkeysDomainPath = path.join(root, "src", "domain", "ui", "hotkeys.mjs");
const commandPaletteDomainPath = path.join(root, "src", "domain", "ui", "command-palette.mjs");
const selectionSetsDomainPath = path.join(root, "src", "domain", "project", "selection-sets.mjs");
const namedViewsDomainPath = path.join(root, "src", "domain", "project", "named-views.mjs");
const sectionViewDomainPath = path.join(root, "src", "domain", "project", "section-view.mjs");
const sectionDerivedDomainPath = path.join(root, "src", "domain", "geometry", "section-derived.mjs");
const layersDomainPath = path.join(root, "src", "domain", "project", "layers.mjs");
const groupsDomainPath = path.join(root, "src", "domain", "project", "groups.mjs");
const assembliesDomainPath = path.join(root, "src", "domain", "project", "assemblies.mjs");
const geometricConstraintsDomainPath = path.join(root, "src", "domain", "constraints", "geometric-constraints.mjs");
const constraintInferenceDomainPath = path.join(root, "src", "domain", "constraints", "constraint-inference.mjs");
const constraintDofDomainPath = path.join(root, "src", "domain", "constraints", "constraint-dof-analysis.mjs");
const autoConstrainDomainPath = path.join(root, "src", "domain", "constraints", "auto-constrain.mjs");
const toleranceProfileDomainPath = path.join(root, "src", "domain", "geometry", "tolerance-profile.mjs");
const fittedGeometryPolicyDomainPath = path.join(root, "src", "domain", "geometry", "fitted-geometry-policy.mjs");
const normalizeFittedGeometryDomainPath = path.join(root, "src", "domain", "geometry", "normalize-fitted-geometry.mjs");
const batchNormalizeFittedDomainPath = path.join(root, "src", "domain", "geometry", "batch-normalize-fitted.mjs");
const deleteDependenciesDomainPath = path.join(root, "src", "domain", "project", "delete-dependencies.mjs");
const geometryMeasurementsDomainPath = path.join(root, "src", "domain", "measurements", "geometry-measurements.mjs");
const dimensionsDomainPath = path.join(root, "src", "domain", "measurements", "dimensions.mjs");
const reviewProgressDomainPath = path.join(root, "src", "domain", "measurements", "review-progress.mjs");
const auditDownloadDomainPath = path.join(root, "src", "domain", "measurements", "audit-download.mjs");
const equipmentRuntimeBridgePath = path.join(root, "src", "ui", "equipment-runtime-bridge.js");
const trimCutRuntimeBridgePath = path.join(root, "src", "ui", "trim-cut-runtime-bridge.js");
const materialDomainPath = path.join(root, "src", "domain", "materials", "material-profiles.mjs");
const machineToolingDomainPath = path.join(root, "src", "domain", "machines", "machine-tooling.mjs");
const machineSetupDomainPath = path.join(root, "src", "domain", "machines", "machine-setup.mjs");
const bendSequenceDomainPath = path.join(root, "src", "domain", "manufacturing", "bend-sequence-analysis.mjs");
const simulationCollisionDomainPath = path.join(root, "src", "domain", "manufacturing", "bending-simulation-collision.mjs");
const clearanceMonitorDomainPath = path.join(root, "src", "domain", "validation", "clearance-monitor.mjs");
const reproducibilityDomainPath = path.join(root, "src", "domain", "validation", "reproducibility.mjs");
const reproducibilityRuntimePath = path.join(root, "src", "ui", "reproducibility-runtime.js");
const equipmentLibraryUiPath = path.join(root, "src", "ui", "equipment-library-ui.js");
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


const invalidTubeCssAnchor =
  ".route-chip .num{color:var(--muted)}";
if(!output.includes(invalidTubeCssAnchor)){
  throw new Error("invalid tube element CSS anchor was not found");
}
output=output.replace(
  invalidTubeCssAnchor,
  invalidTubeCssAnchor+
  ".tb-invalid-tube-element,.tb-invalid-tube-element .tb-tree-label,.tb-invalid-tube-element .tb-tree-icon,.tb-invalid-tube-element .tb-tree-eye,.label3d.tb-invalid-tube-element,.label3d.tb-invalid-tube-element .direct-display-value,.route-chip.tb-invalid-tube-element{color:#ff4c4c!important}"+
  ".tb-invalid-tube-element .direct-degree-symbol{color:#ff4c4c!important}"+
  ".tb-tree-node.tb-invalid-tube-element{background:rgba(255,76,76,.08)!important}"+
  ".label3d.tb-invalid-tube-element{box-shadow:0 0 0 1px rgba(255,76,76,.70)!important}"+
  ".tb-tube-status-dot{width:9px;height:9px;min-width:9px;border-radius:50%;display:inline-block;margin:0 6px 0 1px;box-sizing:border-box;box-shadow:0 0 0 1px rgba(255,255,255,.18),0 0 5px currentColor;vertical-align:middle;flex:0 0 9px}"+
  ".tb-tube-status-dot.ok{background:#43d36b;color:#43d36b}"+
  ".tb-tube-status-dot.problem{background:#ff4c4c;color:#ff4c4c}"
);

const importedTubeBodyColor=0xc77738;
const tubeCopperColor=0xc77738;
const tubeEditMutedColor=0x6f747b;
const importedTubeBendColorAnchor =
  "const mesh = new THREE.Mesh(geo, tubeElementMaterial(0xd98b4a, rowIndex));";
if (!output.includes(importedTubeBendColorAnchor)) {
  throw new Error("Active bend tube color anchor was not found");
}
output = output.replace(
  importedTubeBendColorAnchor,
  "const bendBodyColor=0xc77738;\n" +
  "  const mesh = new THREE.Mesh(geo, tubeElementMaterial(bendBodyColor, rowIndex));"
);

const importedTubeLineNodeAnchor =
  "pos = end; addNode(pipeGroup,pos,0x4da3ff,.06,i,'LINE');";
if (!output.includes(importedTubeLineNodeAnchor)) {
  throw new Error("Active LINE node color anchor was not found");
}
output = output.replace(
  importedTubeLineNodeAnchor,
  "pos = end; addNode(pipeGroup,pos,0xc77738,.06,i,'LINE');"
);

const importedTubeBendNodeAnchor =
  "pos = b.end; dir = b.dir; addNode(pipeGroup,pos, 0xff9a3c,.06,i,'BEND');";
if (!output.includes(importedTubeBendNodeAnchor)) {
  throw new Error("Active BEND node color anchor was not found");
}
output = output.replace(
  importedTubeBendNodeAnchor,
  "pos = b.end; dir = b.dir; addNode(pipeGroup,pos,0xc77738,.06,i,'BEND');"
);


const tubeOpacityAnchor =
  "function tubeElementOpacity(rowIndex){\n"+
  "  if(selectedAssemblyId) return state.rows?.[rowIndex]?.assemblyId===selectedAssemblyId ? 1 : 0.18;\n"+
  "  const active = activeTubeEditRowIndex();\n"+
  "  if (active < 0) return 1;\n"+
  "  return Number(rowIndex) === active ? 1 : 0.18;\n"+
  "}";
if(!output.includes(tubeOpacityAnchor)){
  throw new Error("tubeElementOpacity anchor was not found");
}
output=output.replace(
  tubeOpacityAnchor,
  "function tubeElementOpacity(rowIndex){ return 1; }\n"+
  "function tubeElementDisplayColor(baseColor,rowIndex){\n"+
  "  if(selectedAssemblyId){\n"+
  "    return state.rows?.[rowIndex]?.assemblyId===selectedAssemblyId ? 0xc77738 : 0x6f747b;\n"+
  "  }\n"+
  "  const active=activeTubeEditRowIndex();\n"+
  "  if(active<0)return 0xc77738;\n"+
  "  return Number(rowIndex)===active ? 0xc77738 : 0x6f747b;\n"+
  "}\n"+
  "function tubeRowValidationIssues(tube,rowIndex){\n"+
  "  const issues=[];\n"+
  "  const rows=tube?.rows??(tube?.id===state.activeTubeId?state.rows:[]);\n"+
  "  const index=Number(rowIndex);\n"+
  "  const row=rows?.[index];\n"+
  "  if(!row)return ['Элемент трубы отсутствует'];\n"+
  "  const tool=pipeAt(tube?.diameterIndex);\n"+
  "  const technologicalLmin=Number(tool?.Lmin);\n"+
  "  if(row.type==='LINE'){\n"+
  "    const length=Number(row.L);\n"+
  "    if(!Number.isFinite(length)||length<0)issues.push('Некорректная длина прямого участка');\n"+
  "    else if(Number.isFinite(technologicalLmin)&&!isEndStraightRowIndex(rows,index)&&length+1e-6<technologicalLmin)issues.push('Внутренний прямой участок короче Lmin '+fmt(technologicalLmin,1)+' мм');\n"+
  "    const splitNodes=Array.isArray(row?.straightRun?.nodes_mm)?row.straightRun.nodes_mm.map(Number).filter(Number.isFinite).filter(v=>v>0&&v<length).sort((a,b)=>a-b):[];\n"+
  "    if(splitNodes.length&&Number.isFinite(technologicalLmin)){\n"+
  "      const splitPoints=[0,...splitNodes,length];\n"+
  "      for(let splitIndex=0;splitIndex<splitPoints.length-1;splitIndex++){\n"+
  "        const segmentLength=splitPoints[splitIndex+1]-splitPoints[splitIndex];\n"+
  "        if(segmentLength+1e-6<technologicalLmin)issues.push('Сегмент StraightRun '+(splitIndex+1)+' ('+fmt(segmentLength,1)+' мм) короче Lmin '+fmt(technologicalLmin,1)+' мм');\n"+
  "      }\n"+
  "    }\n"+
  "  }else if(row.type==='BEND'){\n"+
  "    const angle=Number(row.angle);\n"+
  "    if(!Number.isFinite(angle)||Math.abs(angle)<1e-9||Math.abs(angle)>180+1e-6)issues.push('Некорректный угол гиба');\n"+
  "    const clr=Number(row.clr);\n"+
  "    if(!Number.isFinite(clr)||clr<=0)issues.push('Некорректный радиус гиба');\n"+
  "    const technologyClr=Number(tool?.Rb);\n"+
  "    if(Number.isFinite(clr)&&clr>0&&Number.isFinite(technologyClr)&&technologyClr>0&&Math.abs(clr-technologyClr)>0.05){\n"+
  "      issues.push('CLR '+fmt(clr,2)+' мм не соответствует технологическому R'+fmt(technologyClr,2)+' мм');\n"+
  "    }\n"+
  "  }else{\n"+
  "    issues.push('Неизвестный тип элемента трубы');\n"+
  "  }\n"+
  "  try{\n"+
  "    const bounds=tube?.id===state.activeTubeId?analyzePipeBounds(rows,tube?.diameterIndex):analyzeTubeBounds(tube);\n"+
  "    if(bounds?.violatingRows?.includes(index))issues.push('Элемент нарушает габаритную рамку или зазор 5 мм');\n"+
  "  }catch{}\n"+
  "  try{\n"+
  "    const project=projectForTube(tube);\n"+
  "    const collisions=getProjectCollisionAnalysis(project)?.collisions??[];\n"+
  "    const involved=collisions.some(c=>\n"+
  "      (String(c?.tubeAId)===String(tube?.id)&&Number(c?.rowA)===index)||\n"+
  "      (String(c?.tubeBId)===String(tube?.id)&&Number(c?.rowB)===index)\n"+
  "    );\n"+
  "    if(involved)issues.push('Элемент участвует в пересечении');\n"+
  "  }catch{}\n"+
  "  return [...new Set(issues)];\n"+
  "}\n"+
  "function tubeRowIsInvalid(rowIndex,tube=activeTube()){ return tubeRowValidationIssues(tube,rowIndex).length>0; }\n"+
  "function tubeValidationSummary(tube){\n"+
  "  const rows=tube?.rows??(tube?.id===state.activeTubeId?state.rows:[]);\n"+
  "  if(!Array.isArray(rows)||rows.length===0){\n"+
  "    return {valid:false,invalidRowCount:0,issueCount:1,issues:['У трубы нет элементов']};\n"+
  "  }\n"+
  "  let invalidRowCount=0,issueCount=0;const issues=[];\n"+
  "  rows.forEach((row,index)=>{\n"+
  "    const rowIssues=tubeRowValidationIssues(tube,index);\n"+
  "    if(!rowIssues.length)return;\n"+
  "    invalidRowCount+=1;issueCount+=rowIssues.length;\n"+
  "    rowIssues.forEach(issue=>issues.push('Элемент '+(index+1)+': '+issue));\n"+
  "  });\n"+
  "  return {valid:invalidRowCount===0,invalidRowCount,issueCount,issues};\n"+
  "}"
);

const tubeInvalidAnchor =
  "  const invalid = boundsRowIsInvalid(rowIndex);";
if(!output.includes(tubeInvalidAnchor)){
  throw new Error("tubeElementMaterial invalid-state anchor was not found");
}
output=output.replace(
  tubeInvalidAnchor,
  "  const invalid = tubeRowIsInvalid(rowIndex,activeTube());"
);

const tubeShownColorAnchor =
  "  const shownColor = invalid ? 0xff3b30 : color;";
if(!output.includes(tubeShownColorAnchor)){
  throw new Error("tubeElementMaterial shownColor anchor was not found");
}
output=output.replace(
  tubeShownColorAnchor,
  "  const shownColor = invalid ? 0xff3b30 : tubeElementDisplayColor(color,rowIndex);"
);

const selectionOpacityAnchor =
  "  const opacity = tubeElementOpacity(rowIndex);\n"+
  "  if (!obj) return;";
if(!output.includes(selectionOpacityAnchor)){
  throw new Error("applyTubeSelectionOpacity anchor was not found");
}
output=output.replace(
  selectionOpacityAnchor,
  "  const opacity = 1;\n"+
  "  const invalid=tubeRowIsInvalid(rowIndex,activeTube());\n"+
  "  const displayColor=invalid?0xff3b30:tubeElementDisplayColor(0xc77738,rowIndex);\n"+
  "  if (!obj) return;"
);

const selectionMaterialAnchor =
  "      mat.transparent = opacity < 0.999;\n"+
  "      mat.opacity = opacity;\n"+
  "      mat.depthWrite = opacity >= 0.999;";
if(!output.includes(selectionMaterialAnchor)){
  throw new Error("applyTubeSelectionOpacity material anchor was not found");
}
output=output.replace(
  selectionMaterialAnchor,
  "      mat.transparent = false;\n"+
  "      mat.opacity = 1;\n"+
  "      mat.depthWrite = true;\n"+
  "      if(mat.color)mat.color.setHex(displayColor);\n"+
  "      if(invalid&&mat.emissive){mat.emissive.setHex(0x8f0000);mat.emissiveIntensity=.34;}"
);

const passiveConstantsAnchor =
  "const PASSIVE_TUBE_COLOR=0x7f8998;\n"+
  "const PASSIVE_TUBE_OPACITY=.30;";
if(!output.includes(passiveConstantsAnchor)){
  throw new Error("passive tube color constants were not found");
}
output=output.replace(
  passiveConstantsAnchor,
  "const PASSIVE_TUBE_COLOR=0xc77738;\n"+
  "const PASSIVE_TUBE_OPACITY=1;"
);

const passiveMaterialAnchor =
  "function passiveTubeMaterial(color=PASSIVE_TUBE_COLOR,opacity=PASSIVE_TUBE_OPACITY){\n"+
  "  return new THREE.MeshStandardMaterial({\n"+
  "    color,\n"+
  "    roughness:.88,\n"+
  "    metalness:0,\n"+
  "    transparent:true,\n"+
  "    opacity,\n"+
  "    depthTest:true,\n"+
  "    depthWrite:false\n"+
  "  });\n"+
  "}";
if(!output.includes(passiveMaterialAnchor)){
  throw new Error("passiveTubeMaterial anchor was not found");
}
output=output.replace(
  passiveMaterialAnchor,
  "function passiveTubeMaterial(color=PASSIVE_TUBE_COLOR,opacity=PASSIVE_TUBE_OPACITY,invalid=false){\n"+
  "  const editIsolation=!!selectedAssemblyId||activeTubeEditRowIndex()>=0;\n"+
  "  const shownColor=invalid?0xff3b30:(editIsolation?0x6f747b:0xc77738);\n"+
  "  return new THREE.MeshStandardMaterial({\n"+
  "    color:shownColor,\n"+
  "    roughness:.58,\n"+
  "    metalness:.08,\n"+
  "    emissive:invalid?0x8f0000:0x000000,\n"+
  "    emissiveIntensity:invalid?.34:0,\n"+
  "    transparent:false,\n"+
  "    opacity:1,\n"+
  "    depthTest:true,\n"+
  "    depthWrite:true\n"+
  "  });\n"+
  "}"
);



const passiveCylinderAnchor =
  "function makePassiveCylinder(a,b,r,color=PASSIVE_TUBE_COLOR,opacity=PASSIVE_TUBE_OPACITY){\n"+
  "  const dir=b.clone().sub(a),len=Math.max(.001,dir.length());\n"+
  "  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,len,24,1,false),passiveTubeMaterial(color,opacity));";
if(!output.includes(passiveCylinderAnchor)){
  throw new Error("passive cylinder anchor was not found");
}
output=output.replace(
  passiveCylinderAnchor,
  "function makePassiveCylinder(a,b,r,color=PASSIVE_TUBE_COLOR,opacity=PASSIVE_TUBE_OPACITY,tube=null,rowIndex=-1){\n"+
  "  const dir=b.clone().sub(a),len=Math.max(.001,dir.length());\n"+
  "  const invalid=Number.isInteger(rowIndex)&&tubeRowIsInvalid(rowIndex,tube);\n"+
  "  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,len,24,1,false),passiveTubeMaterial(color,opacity,invalid));"
);

const passiveBendAnchor =
  "function makePassiveBend(start,dir,plane,angleRad,R,tubeR,rotationDeg=0,opacity=PASSIVE_TUBE_OPACITY){";
if(!output.includes(passiveBendAnchor)){
  throw new Error("passive bend anchor was not found");
}
output=output.replace(
  passiveBendAnchor,
  "function makePassiveBend(start,dir,plane,angleRad,R,tubeR,rotationDeg=0,opacity=PASSIVE_TUBE_OPACITY,tube=null,rowIndex=-1){"
);
const passiveBendMeshAnchor =
  "  const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(16,steps*2),tubeR,14,false),passiveTubeMaterial(PASSIVE_TUBE_COLOR,opacity));";
if(!output.includes(passiveBendMeshAnchor)){
  throw new Error("passive bend material anchor was not found");
}
output=output.replace(
  passiveBendMeshAnchor,
  "  const invalid=Number.isInteger(rowIndex)&&tubeRowIsInvalid(rowIndex,tube);\n"+
  "  const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(16,steps*2),tubeR,14,false),passiveTubeMaterial(PASSIVE_TUBE_COLOR,opacity,invalid));"
);

const passiveLoopAnchor = "  (tube.rows||[]).forEach(r=>{";
if(!output.includes(passiveLoopAnchor)){
  throw new Error("passive tube row loop anchor was not found");
}
output=output.replace(passiveLoopAnchor,"  (tube.rows||[]).forEach((r,rowIndex)=>{");
const passiveCylinderCall = "      tubeGroup.add(makePassiveCylinder(pos,end,tubeR));";
if(!output.includes(passiveCylinderCall))throw new Error("passive cylinder call anchor missing");
output=output.replace(passiveCylinderCall,"      tubeGroup.add(makePassiveCylinder(pos,end,tubeR,PASSIVE_TUBE_COLOR,PASSIVE_TUBE_OPACITY,tube,rowIndex));");
const passiveBendCall = "      const b=makePassiveBend(pos,dir,plane,angle,bendR,tubeR,getBendRotationValue(r));";
if(!output.includes(passiveBendCall))throw new Error("passive bend call anchor missing");
output=output.replace(passiveBendCall,"      const b=makePassiveBend(pos,dir,plane,angle,bendR,tubeR,getBendRotationValue(r),PASSIVE_TUBE_OPACITY,tube,rowIndex);");


const tubeClearanceMeasureAnchor =
  "function collisionCountForTube(tube,project=null){";
if(!output.includes(tubeClearanceMeasureAnchor)){
  throw new Error("collisionCountForTube anchor was not found for clearance measurement");
}
const tubeClearanceMeasureHelpers =
  "function measureTubePairClearance(project,tubeAId,tubeBId){\n"+
  "  if(!project||!window.THREE)return {checked:false,distance_mm:null,source:'project-clearance-geometry',message:'Project or THREE unavailable'};\n"+
  "  const a=(project.tubes||[]).find(t=>String(t?.id)===String(tubeAId));\n"+
  "  const b=(project.tubes||[]).find(t=>String(t?.id)===String(tubeBId));\n"+
  "  if(!a||!b||String(a.id)===String(b.id))return {checked:false,distance_mm:null,source:'project-clearance-geometry',message:'Two distinct tubes are required'};\n"+
  "  const ga=buildTubeCollisionGeometry(a,project),gb=buildTubeCollisionGeometry(b,project);\n"+
  "  if(!ga?.segments?.length||!gb?.segments?.length)return {checked:false,distance_mm:null,source:'project-clearance-geometry',message:'Tube collision geometry unavailable'};\n"+
  "  let best=null;\n"+
  "  for(const sa of ga.segments)for(const sb of gb.segments){const closest=closestSegmentData(sa.a,sa.b,sb.a,sb.b),surface=closest.distance-(sa.radius+sb.radius);if(!best||surface<best.surface)best={surface,closest,sa,sb};}\n"+
  "  if(!best)return {checked:false,distance_mm:null,source:'project-clearance-geometry',message:'No segment pair available'};\n"+
  "  const scale=Number(GEOM_SCALE)||1;\n"+
  "  return {checked:true,distance_mm:best.surface/scale,centerline_distance_mm:best.closest.distance/scale,closest_points:{a:{x:best.closest.c1.x/scale,y:best.closest.c1.y/scale,z:best.closest.c1.z/scale},b:{x:best.closest.c2.x/scale,y:best.closest.c2.y/scale,z:best.closest.c2.z/scale}},rowA:best.sa.rowIndex,rowB:best.sb.rowIndex,source:'project-clearance-geometry',checked_at:new Date().toISOString()};\n"+
  "}\n";
output=output.replace(tubeClearanceMeasureAnchor,tubeClearanceMeasureHelpers+tubeClearanceMeasureAnchor);


const clearanceFocusHelpers =
  "let tbClearanceFocusGroup=null;\n"+
  "function focusClearanceMeasurement(measurement){\n"+
  "  const a=measurement?.closest_points?.a,b=measurement?.closest_points?.b;\n"+
  "  if(!a||!b||!camera||!controls||!window.THREE)return false;\n"+
  "  const scale=Number(GEOM_SCALE)||1,pA=new THREE.Vector3(Number(a.x)*scale,Number(a.y)*scale,Number(a.z)*scale),pB=new THREE.Vector3(Number(b.x)*scale,Number(b.y)*scale,Number(b.z)*scale),target=pA.clone().add(pB).multiplyScalar(.5);\n"+
  "  if(!Number.isFinite(target.x)||!Number.isFinite(target.y)||!Number.isFinite(target.z))return false;\n"+
  "  if(pipeGroup){if(tbClearanceFocusGroup?.parent)tbClearanceFocusGroup.parent.remove(tbClearanceFocusGroup);const status=String(measurement?.status||'NotChecked'),color=status==='Red'?0xff3b30:status==='Yellow'?0xffd54a:status==='Green'?0x43d36b:0x4da3ff;const group=new THREE.Group();group.userData={helper:true,clearanceFocusMarker:true};const sphereGeo=new THREE.SphereGeometry(.12,18,12),sphereMat=new THREE.MeshBasicMaterial({color,depthTest:false,depthWrite:false});for(const p of [pA,pB]){const marker=new THREE.Mesh(sphereGeo,sphereMat);marker.position.copy(p);marker.renderOrder=9800;marker.userData={helper:true,clearanceFocusMarker:true};group.add(marker);}const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([pA,pB]),new THREE.LineBasicMaterial({color,depthTest:false,depthWrite:false}));line.renderOrder=9799;line.userData={helper:true,clearanceFocusMarker:true};group.add(line);pipeGroup.add(group);tbClearanceFocusGroup=group;}\n"+
  "  const offset=camera.position.clone().sub(controls.target);\n"+
  "  controls.target.copy(target);camera.position.copy(target.clone().add(offset));camera.lookAt(target);controls.update();\n"+
  "  try{markViewerDirty();}catch{}\n"+
  "  return true;\n"+
  "}\n";
const fixedEndEngineeringExportAnchor =
  "window.TubeBenderEngineering={open:openCenter,ensure:ensureIndustrialState,diagnoseTube,diagnoseProject,rebuildRouteGraph,manufacturingData,productionReleaseDecision,generateAutoroutes,captureRevision,compareRevision,exportManufacturing,simulation:";
if(!output.includes(fixedEndEngineeringExportAnchor)){
  throw new Error("TubeBenderEngineering fixed-end export anchor was not found");
}
const fixedEndEngineeringHelpers =
  "function fixedEndFindTube(idv){\n"+
  "  for(const project of state.projects||[])for(const tube of project.tubes||[])if(String(tube?.id)===String(idv))return tube;\n"+
  "  return null;\n"+
  "}\n"+
  "function fixedEndRowSignature(row,index){\n"+
  "  if(!row)return '';\n"+
  "  return JSON.stringify({key:String(row.elementId||('#'+index)),type:String(row.type||''),L:row.type==='LINE'?round(n(row.L),6):null,angle:row.type==='BEND'?round(n(row.angle),6):null,clr:row.type==='BEND'?round(n(row.clr),6):null,plane:row.type==='BEND'?String(row.plane||''):null,rot:row.type==='BEND'?round(n(getBendRotationValue(row)),6):null,assemblyId:String(row.assemblyId||''),standardDependent:row.standardDependent===true});\n"+
  "}\n"+
  "function captureFixedEndConstraint(t=activeTube()){\n"+
  "  if(tbWholeObjectTransformDepth>0)return null;\n"+
  "  if(!t)return null;\n"+
  "  const p2=t?.engineering?.ports?.P2;\n"+
  "  if(!p2?.locked||!p2.position)return null;\n"+
  "  const assemblyConstraint=window.TubeBenderAssemblies?.captureTubeEndConstraint?.(t)??null;\n"+
  "  return {tubeId:String(t.id),target:deep(p2.position),assemblyConstraint:assemblyConstraint?deep(assemblyConstraint):null,rows:(tubeRows(t)||[]).map((row,index)=>({key:String(row?.elementId||('#'+index)),signature:fixedEndRowSignature(row,index)}))};\n"+
  "}\n"+
  "function fixedEndDistance(a,b){return Math.hypot(n(a?.x)-n(b?.x),n(a?.y)-n(b?.y),n(a?.z)-n(b?.z));}\n"+
  "function fixedEndInvert3(m){\n"+
  "  const a=m[0],b=m[1],c=m[2],d=m[3],e=m[4],f=m[5],g=m[6],h=m[7],i=m[8];\n"+
  "  const A=e*i-f*h,B=-(d*i-f*g),C=d*h-e*g,D=-(b*i-c*h),E=a*i-c*g,F=-(a*h-b*g),G=b*f-c*e,H=-(a*f-c*d),I=a*e-b*d;\n"+
  "  const det=a*A+b*B+c*C;if(!Number.isFinite(det)||Math.abs(det)<1e-15)return null;const q=1/det;\n"+
  "  return [A*q,D*q,G*q,B*q,E*q,H*q,C*q,F*q,I*q];\n"+
  "}\n"+
  "function setEndConstraint(tubeOrId,fixed=true){\n"+
  "  const t=typeof tubeOrId==='object'?tubeOrId:fixedEndFindTube(tubeOrId);\n"+
  "  if(!t)return {ok:false,message:'Труба не найдена'};\n"+
  "  ensureTubeEngineering(t,projectForTube(t)||activeProject());\n"+
  "  const p2=t.engineering.ports.P2;\n"+
  "  if(!fixed){p2.locked=false;try{window.TubeBenderAssemblies?.clearTubePortConstraint?.(t,'P2');}catch{}rebuildRouteGraph(t,false);return {ok:true,fixed:false};}\n"+
  "  const g=geometryForTube(t);if(!g?.endPosition)return {ok:false,message:'Не удалось определить конец трубы'};\n"+
  "  p2.position={x:round(g.endPosition.x/GEOM_SCALE,6),y:round(g.endPosition.y/GEOM_SCALE,6),z:round(g.endPosition.z/GEOM_SCALE,6)};\n"+
  "  p2.direction=vecAxis(g.endDirection);p2.locked=true;try{window.TubeBenderAssemblies?.syncTubePortConstraints?.(t);}catch{}rebuildRouteGraph(t,false);\n"+
  "  return {ok:true,fixed:true,position:deep(p2.position),assemblyConstraint:deep(p2.assembly_constraint??null)};\n"+
  "}\n"+
  "function enforceFixedEndConstraint(guard){\n"+
  "  if(!guard?.tubeId||!guard?.target)return {ok:true,adjustedRows:[]};\n"+
  "  const t=fixedEndFindTube(guard.tubeId);if(!t)return {ok:false,message:'Изменение отменено: зафиксированная труба не найдена'};\n"+
  "  const p2=t?.engineering?.ports?.P2;if(!p2?.locked)return {ok:true,adjustedRows:[]};\n"+
  "  const assemblyResolved=guard.assemblyConstraint?window.TubeBenderAssemblies?.resolveTubeEndConstraintTarget?.(guard.assemblyConstraint,t):null;\n"+
  "  if(guard.assemblyConstraint&&!assemblyResolved?.position)return {ok:false,message:'Изменение отменено: локальная фиксация P2 потеряла родительскую Assembly'};\n"+
  "  const target=assemblyResolved?.position??guard.target;p2.position=deep(target);\n"+
  "  const rows=tubeRows(t)||[],before=new Map((guard.rows||[]).map(item=>[String(item.key),item.signature])),changed=new Set();\n"+
  "  rows.forEach((row,index)=>{const key=String(row?.elementId||('#'+index));if(before.get(key)!==fixedEndRowSignature(row,index))changed.add(key);});\n"+
  "  let g=geometryForTube(t);if(!g?.endPosition)return {ok:false,message:'Изменение отменено: не удалось вычислить конец трубы'};\n"+
  "  let current={x:g.endPosition.x/GEOM_SCALE,y:g.endPosition.y/GEOM_SCALE,z:g.endPosition.z/GEOM_SCALE};\n"+
  "  if(fixedEndDistance(current,target)<=0.02){rebuildRouteGraph(t,false);return {ok:true,adjustedRows:[],target:deep(target),space:assemblyResolved?'assembly-local':'world'};}\n"+
  "  const candidates=(g.elements||[]).filter(el=>el.type==='LINE').map(el=>({el,row:rows[el.rowIndex],rowIndex:el.rowIndex})).filter(item=>{const key=String(item.row?.elementId||('#'+item.rowIndex));return item.row&&!changed.has(key)&&item.row.standardDependent!==true&&!item.row.assemblyId&&Number.isFinite(Number(item.row.L));});\n"+
  "  if(!candidates.length)return {ok:false,message:'Изменение невозможно: нет свободного прямого участка для сохранения зафиксированного конца'};\n"+
  "  const delta=new THREE.Vector3(n(target.x)-current.x,n(target.y)-current.y,n(target.z)-current.z);\n"+
  "  const m=[1e-9,0,0,0,1e-9,0,0,0,1e-9];\n"+
  "  for(const item of candidates){const v=item.el.direction.clone().normalize();item.dir=v;m[0]+=v.x*v.x;m[1]+=v.x*v.y;m[2]+=v.x*v.z;m[3]+=v.y*v.x;m[4]+=v.y*v.y;m[5]+=v.y*v.z;m[6]+=v.z*v.x;m[7]+=v.z*v.y;m[8]+=v.z*v.z;}\n"+
  "  const inv=fixedEndInvert3(m);if(!inv)return {ok:false,message:'Изменение невозможно: недостаточно степеней свободы для сохранения конца'};\n"+
  "  const z=new THREE.Vector3(inv[0]*delta.x+inv[1]*delta.y+inv[2]*delta.z,inv[3]*delta.x+inv[4]*delta.y+inv[5]*delta.z,inv[6]*delta.x+inv[7]*delta.y+inv[8]*delta.z);\n"+
  "  const originals=[],straightIndexes=straightRowIndexes(rows),firstStraight=straightIndexes[0]??-1,lastStraight=straightIndexes.length?straightIndexes[straightIndexes.length-1]:-1,minInternal=Math.max(0,n(pipeAt(t.diameterIndex)?.Lmin,0));\n"+
  "  for(const item of candidates){const correction=item.dir.dot(z),oldLength=n(item.row.L),next=oldLength+correction,minimum=(item.rowIndex===firstStraight||item.rowIndex===lastStraight)?0.001:minInternal;if(!Number.isFinite(next)||next<minimum-1e-6||next>MAX_STOCK_LENGTH+1e-6)return {ok:false,message:'Изменение невозможно: для фиксации конца потребовалась бы недопустимая длина прямого участка'};originals.push({row:item.row,L:item.row.L,LFormula:item.row.LFormula,rowIndex:item.rowIndex});item.row.L=round(next,6);item.row.LFormula=String(item.row.L);}\n"+
  "  if(String(t.id)===String(state.activeTubeId))t.rows=state.rows;\n"+
  "  g=geometryForTube(t);current={x:g.endPosition.x/GEOM_SCALE,y:g.endPosition.y/GEOM_SCALE,z:g.endPosition.z/GEOM_SCALE};const residual=fixedEndDistance(current,target);\n"+
  "  if(residual>0.05){originals.forEach(item=>{item.row.L=item.L;item.row.LFormula=item.LFormula;});return {ok:false,message:'Изменение невозможно: зафиксированный конец нельзя сохранить с текущими направлениями участков'};}\n"+
  "  rebuildRouteGraph(t,false);return {ok:true,adjustedRows:originals.map(item=>item.rowIndex),residualMm:round(residual,6),target:deep(target),space:assemblyResolved?'assembly-local':'world',assemblyId:assemblyResolved?.assembly_id??null};\n"+
  "}\n";
output=output.replace(
  fixedEndEngineeringExportAnchor,
  clearanceFocusHelpers+fixedEndEngineeringHelpers+"\n"+
  "window.TubeBenderEngineering={getState:()=>state,activeProject:()=>activeProject(),activeTube:()=>activeTube(),save:()=>save(),renderAll:()=>renderAll(),reloadActiveTube:()=>loadActiveTubeToState(),modelCommand:tbModelCommand,wholeObjectCommand:tbWholeObjectCommand,toast:(message)=>ptToast(String(message??'')),readonly:()=>typeof poReadOnly==='function'&&poReadOnly(),projectCollisionAnalysis:(projectValue)=>getProjectCollisionAnalysis(projectValue||activeProject()),measureTubeClearance:(projectValue,tubeAId,tubeBId)=>measureTubePairClearance(projectValue||activeProject(),tubeAId,tubeBId),focusClearanceMeasurement:(measurement)=>focusClearanceMeasurement(measurement),open:openCenter,ensure:ensureIndustrialState,diagnoseTube,diagnoseProject,rebuildRouteGraph,geometryForTube,captureFixedEndConstraint,enforceFixedEndConstraint,setEndConstraint,manufacturingData,productionReleaseDecision,generateAutoroutes,captureRevision,compareRevision,exportManufacturing,simulation:"
);
const terminalTubeEndNodeAnchor =
  "    if ((state.rows || []).length) addNode(pipeGroup,pos,0x43d36b,.105, Math.max(0,(state.rows||[]).length-1), state.rows?.[(state.rows||[]).length-1]?.type || 'LINE');";
if(!output.includes(terminalTubeEndNodeAnchor)){
  throw new Error("terminal tube end node anchor was not found");
}
output=output.replace(
  terminalTubeEndNodeAnchor,
  "    if ((state.rows || []).length){\n"+
  "      const tubeEndNode=addNode(pipeGroup,pos,activeTube()?.engineering?.ports?.P2?.locked?0xffc247:0x43d36b,.105,Math.max(0,(state.rows||[]).length-1),state.rows?.[(state.rows||[]).length-1]?.type||'LINE');\n"+
  "      if(tubeEndNode){tubeEndNode.traverse?.(obj=>{obj.userData=obj.userData||{};obj.userData.tubeEnd=true;});tubeEndNode.userData.tubeEnd=true;}\n"+
  "      if(activeTube()?.engineering?.ports?.P2?.locked)addStaticLabel('⚓',pos.clone().add(new THREE.Vector3(0,0,.28)),'tube-end-fixed');\n"+
  "    }"
);

const projectTreeEndAnchor =
  "    });\n  });\n  host.innerHTML=items.join('');";
if(!output.includes(projectTreeEndAnchor)){
  throw new Error("project tree tube-end insertion anchor was not found");
}
output=output.replace(
  projectTreeEndAnchor,
  "    });\n"+
  "    const endFixed=t?.engineering?.ports?.P2?.locked===true;\n"+
  "    items.push(`<div class=\"tb-tree-node level2 clickable ${endFixed?'tb-tube-end-fixed':''}\" data-tree-end=\"1\"><span class=\"tb-tree-icon\">${endFixed?'⚓':'◎'}</span><span class=\"tb-tree-label\">Конец трубы</span><span class=\"tb-tree-eye\">${endFixed?'зафиксирован':'свободный'}</span></div>`);\n"+
  "  });\n"+
  "  host.innerHTML=items.join('');"
);
const p1PortCardUiAnchor =
  "<label class=\"eng-check\"><input id=\"engPort_${k}_locked\" type=\"checkbox\" ${p.locked?'checked':''}> Ассоциативно закрепить порт</label>";
if(!output.includes(p1PortCardUiAnchor)){
  throw new Error("P1/P2 port-card lock control anchor was not found");
}
output=output.replace(
  p1PortCardUiAnchor,
  "${k==='P1'?'<label class=\"eng-check\"><input id=\"engPort_P1_locked\" type=\"checkbox\" checked disabled> ⚓ Начальная точка всегда зафиксирована</label>':`<label class=\"eng-check\"><input id=\"engPort_${k}_locked\" type=\"checkbox\" ${p.locked?'checked':''}> Ассоциативно закрепить порт</label>`}"
);
const p1AlwaysFixedAnchor =
  "if(!e.ports.P1)e.ports.P1={id:id('port'),name:'P1',locked:false,position:deep(t.origin||{x:0,y:0,z:0}),direction:t.startAxis||'+X',diameter:null,endType:'plain',ownerObjectId:'',externalRefId:''};";
if(!output.includes(p1AlwaysFixedAnchor)){
  throw new Error("P1 default anchor was not found");
}
output=output.replace(
  p1AlwaysFixedAnchor,
  "if(!e.ports.P1)e.ports.P1={id:id('port'),name:'P1',locked:true,position:deep(t.origin||{x:0,y:0,z:0}),direction:t.startAxis||'+X',diameter:null,endType:'plain',ownerObjectId:'',externalRefId:''};e.ports.P1.locked=true;"
);

const p1RouteSyncAnchor =
  "if(e.ports?.P1&&!e.ports.P1.locked){e.ports.P1.position=deep(t.origin||state.origin);e.ports.P1.direction=t.startAxis||state.startAxis||'+X';}";
if(!output.includes(p1RouteSyncAnchor)){
  throw new Error("P1 route sync anchor was not found");
}
output=output.replace(
  p1RouteSyncAnchor,
  "if(e.ports?.P1){e.ports.P1.locked=true;e.ports.P1.position=deep(t.origin||state.origin);e.ports.P1.direction=t.startAxis||state.startAxis||'+X';}"
);

const p1SaveLockAnchor =
  "q.locked=!!E(`engPort_${k}_locked`)?.checked;";
if(!output.includes(p1SaveLockAnchor)){
  throw new Error("port lock save anchor was not found");
}
output=output.replace(
  p1SaveLockAnchor,
  "q.locked=k==='P1'?true:!!E(`engPort_${k}_locked`)?.checked;"
);

const historyPanelBeginAnchor =
  "function tbHistoryBegin(label){";
if(!output.includes(historyPanelBeginAnchor)){
  throw new Error("tbHistoryBegin anchor missing for History panel");
}
const historyPanelRuntime =
  "const TB_HISTORY_STORAGE_KEY='tubebender.modelHistory.v1';\n"+
  "let tbHistoryPersistenceLoading=false;\n"+
  "function tbHistorySignature(snapshot){const text=tbHistorySnapshotKey(snapshot);let hash=2166136261;for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}return (hash>>>0).toString(16)+':'+text.length;}\n"+
  "function tbHistoryPersist(){\n"+
  "  if(tbHistoryPersistenceLoading||tbHistory.transaction||tbHistory.applying)return false;\n"+
  "  let current;try{current=tbHistorySnapshot();}catch{return false;}\n"+
  "  const base={version:1,current_signature:tbHistorySignature(current),saved_at:new Date().toISOString()};\n"+
  "  const undo=[...tbHistory.undo],redo=[...tbHistory.redo];\n"+
  "  let keepUndo=undo.length,keepRedo=redo.length;\n"+
  "  while(true){\n"+
  "    const payload={...base,undo:undo.slice(Math.max(0,undo.length-keepUndo)),redo:redo.slice(Math.max(0,redo.length-keepRedo)),truncated:keepUndo<undo.length||keepRedo<redo.length};\n"+
  "    try{localStorage.setItem(TB_HISTORY_STORAGE_KEY,JSON.stringify(payload));return true;}catch(error){\n"+
  "      if(keepUndo>0){keepUndo=Math.max(0,keepUndo-5);continue;}\n"+
  "      if(keepRedo>0){keepRedo=Math.max(0,keepRedo-5);continue;}\n"+
  "      try{localStorage.removeItem(TB_HISTORY_STORAGE_KEY);}catch{}return false;\n"+
  "    }\n"+
  "  }\n"+
  "}\n"+
  "function tbHistoryRestorePersisted(){\n"+
  "  let raw=null;try{raw=localStorage.getItem(TB_HISTORY_STORAGE_KEY);}catch{return false;}\n"+
  "  if(!raw)return false;\n"+
  "  let saved;try{saved=JSON.parse(raw);}catch{try{localStorage.removeItem(TB_HISTORY_STORAGE_KEY);}catch{}return false;}\n"+
  "  if(saved?.version!==1||!Array.isArray(saved.undo)||!Array.isArray(saved.redo))return false;\n"+
  "  let current;try{current=tbHistorySnapshot();}catch{return false;}\n"+
  "  if(saved.current_signature!==tbHistorySignature(current)){try{localStorage.removeItem(TB_HISTORY_STORAGE_KEY);}catch{}return false;}\n"+
  "  const valid=(entry)=>entry&&typeof entry.label==='string'&&entry.before?.state&&Array.isArray(entry.before?.pipeDb)&&entry.after?.state&&Array.isArray(entry.after?.pipeDb);\n"+
  "  if(!saved.undo.every(valid)||!saved.redo.every(valid)){try{localStorage.removeItem(TB_HISTORY_STORAGE_KEY);}catch{}return false;}\n"+
  "  tbHistoryPersistenceLoading=true;\n"+
  "  try{tbHistory.undo.splice(0,tbHistory.undo.length,...saved.undo.slice(-TB_HISTORY_LIMIT));tbHistory.redo.splice(0,tbHistory.redo.length,...saved.redo.slice(-TB_HISTORY_LIMIT));}\n"+
  "  finally{tbHistoryPersistenceLoading=false;}\n"+
  "  return true;\n"+
  "}\n"+
  "function tbHistoryTimeline(){return [...tbHistory.undo,...tbHistory.redo.slice().reverse()];}\n"+
  "function tbHistoryCursor(){return tbHistory.undo.length;}\n"+
  "function tbHistoryJump(targetIndex){\n"+
  "  if(typeof poReadOnly==='function'&&poReadOnly()){ptToast('Проект открыт только для просмотра');return false;}\n"+
  "  if(tbHistory.transaction||tbHistory.applying)return false;\n"+
  "  const all=tbHistoryTimeline();\n"+
  "  if(!all.length)return false;\n"+
  "  const target=Math.max(0,Math.min(all.length,Math.trunc(Number(targetIndex))));\n"+
  "  if(target===tbHistoryCursor())return true;\n"+
  "  const snapshot=target===0?all[0].before:all[target-1].after;\n"+
  "  if(!tbHistoryRestore(snapshot))return false;\n"+
  "  tbHistory.undo.splice(0,tbHistory.undo.length,...all.slice(0,target));\n"+
  "  tbHistory.redo.splice(0,tbHistory.redo.length,...all.slice(target).reverse());\n"+
  "  tbHistoryUpdateUi();\n"+
  "  ptToast('History: восстановлен шаг '+target+' из '+all.length);\n"+
  "  return true;\n"+
  "}\n"+
  "function tbHistoryEnsurePanel(){\n"+
  "  let panel=document.getElementById('tbHistoryPanel');\n"+
  "  if(panel)return panel;\n"+
  "  const style=document.createElement('style');style.id='tbHistoryPanelStyles';style.textContent='#tbHistoryToggle{position:fixed;right:14px;bottom:14px;z-index:120280;background:#26384b;color:#eef5ff;border:1px solid #455b72;border-radius:6px;padding:6px 10px;cursor:pointer}#tbHistoryPanel{position:fixed;right:14px;bottom:50px;width:300px;max-height:55vh;display:none;z-index:120290;background:rgba(13,22,32,.98);color:#eef5ff;border:1px solid #41566f;border-radius:8px;box-shadow:0 10px 30px rgba(0,0,0,.45);font:12px system-ui;overflow:hidden}#tbHistoryPanel.open{display:flex;flex-direction:column}.tb-history-head{display:flex;align-items:center;gap:6px;padding:8px;border-bottom:1px solid #304154}.tb-history-head .grow{flex:1}.tb-history-list{overflow:auto;padding:5px}.tb-history-row{width:100%;display:flex;align-items:center;gap:7px;text-align:left;border:0;border-radius:5px;padding:6px 7px;margin:2px 0;background:transparent;color:#dce8f5;cursor:pointer}.tb-history-row:hover{background:#1c2a39}.tb-history-row.current{background:#28435d;color:#fff}.tb-history-row.future{color:#7f91a5}.tb-history-index{width:26px;text-align:right;color:#71859b}.tb-history-empty{padding:14px;color:#8799ad}';document.head.appendChild(style);\n"+
  "  const toggle=document.createElement('button');toggle.id='tbHistoryToggle';toggle.type='button';toggle.textContent='History';toggle.title='История операций';document.body.appendChild(toggle);\n"+
  "  panel=document.createElement('section');panel.id='tbHistoryPanel';panel.innerHTML='<div class=\"tb-history-head\"><b>History</b><span class=\"grow\"></span><button data-history-undo>↶</button><button data-history-redo>↷</button><button data-history-close>×</button></div><div class=\"tb-history-list\" data-history-list></div>';document.body.appendChild(panel);\n"+
  "  toggle.onclick=()=>{panel.classList.toggle('open');tbHistoryPanelRender();};\n"+
  "  panel.querySelector('[data-history-close]').onclick=()=>panel.classList.remove('open');\n"+
  "  panel.querySelector('[data-history-undo]').onclick=()=>tbUndo();\n"+
  "  panel.querySelector('[data-history-redo]').onclick=()=>tbRedo();\n"+
  "  panel.querySelector('[data-history-list]').onclick=(event)=>{const row=event.target.closest('[data-history-target]');if(row)tbHistoryJump(Number(row.dataset.historyTarget));};\n"+
  "  return panel;\n"+
  "}\n"+
  "function tbHistoryPanelRender(){\n"+
  "  if(typeof document==='undefined')return;\n"+
  "  const panel=tbHistoryEnsurePanel(),list=panel.querySelector('[data-history-list]'),all=tbHistoryTimeline(),cursor=tbHistoryCursor();\n"+
  "  panel.querySelector('[data-history-undo]').disabled=cursor<=0||!!tbHistory.transaction;\n"+
  "  panel.querySelector('[data-history-redo]').disabled=cursor>=all.length||!!tbHistory.transaction;\n"+
  "  if(!all.length){list.innerHTML='<div class=\"tb-history-empty\">История пуста</div>';return;}\n"+
  "  const rows=[{target:0,label:'Начальное состояние',future:cursor<0}];\n"+
  "  all.forEach((entry,index)=>rows.push({target:index+1,label:entry.label||'Изменение',future:index+1>cursor}));\n"+
  "  list.innerHTML=rows.map(row=>'<button class=\"tb-history-row '+(row.target===cursor?'current ':'')+(row.future?'future':'')+'\" data-history-target=\"'+row.target+'\"><span class=\"tb-history-index\">'+row.target+'</span><span>'+String(row.label).replace(/[&<>\"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[ch]))+'</span></button>').join('');\n"+
  "}\n";
output=output.replace(historyPanelBeginAnchor,historyPanelRuntime+historyPanelBeginAnchor);

const historyUiUpdateAnchor =
  "  if(redo){\n"+
  "    redo.disabled=!canRedo;\n"+
  "    redo.classList.toggle('disabled',!canRedo);\n"+
  "    redo.title=canRedo?\`Повторить: \${tbHistory.redo.at(-1)?.label||'изменение'}\`:'Нет действий для повтора';\n"+
  "  }\n"+
  "}";
if(!output.includes(historyUiUpdateAnchor)){
  throw new Error("tbHistoryUpdateUi end anchor missing for History panel");
}
output=output.replace(
  historyUiUpdateAnchor,
  "  if(redo){\n"+
  "    redo.disabled=!canRedo;\n"+
  "    redo.classList.toggle('disabled',!canRedo);\n"+
  "    redo.title=canRedo?\`Повторить: \${tbHistory.redo.at(-1)?.label||'изменение'}\`:'Нет действий для повтора';\n"+
  "  }\n"+
  "  try{tbHistoryPanelRender();}catch{}\n"+
  "  try{tbHistoryPersist();}catch{}\n"+
  "  try{window.dispatchEvent(new CustomEvent('tubebender-history-change',{detail:{undo:tbHistory.undo.length,redo:tbHistory.redo.length}}));}catch{}\n"+
  "}"
);

const historyExportAnchor =
  "window.TubeBenderHistory={\n"+
  "  undo:tbUndo,\n"+
  "  redo:tbRedo,\n"+
  "  clear:tbHistoryClear,\n"+
  "  canUndo:()=>tbHistory.undo.length>0,\n"+
  "  canRedo:()=>tbHistory.redo.length>0,\n"+
  "  execute:tbModelCommand\n"+
  "};";
if(!output.includes(historyExportAnchor)){
  throw new Error("TubeBenderHistory export anchor missing");
}
output=output.replace(
  historyExportAnchor,
  "window.TubeBenderHistory={\n"+
  "  undo:tbUndo,\n"+
  "  redo:tbRedo,\n"+
  "  clear:tbHistoryClear,\n"+
  "  canUndo:()=>tbHistory.undo.length>0,\n"+
  "  canRedo:()=>tbHistory.redo.length>0,\n"+
  "  execute:tbModelCommand,\n"+
  "  timeline:()=>tbHistoryTimeline().map((entry,index)=>({index:index+1,label:entry.label||'Изменение'})),\n"+
  "  cursor:tbHistoryCursor,\n"+
  "  jump:tbHistoryJump,\n"+
  "  openPanel:()=>{const panel=tbHistoryEnsurePanel();panel.classList.add('open');tbHistoryPanelRender();},\n"+
  "  persist:tbHistoryPersist,\n"+
  "  restorePersisted:tbHistoryRestorePersisted\n"+
  "};\n"+
  "tbHistoryRestorePersisted();\n"+
  "if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{tbHistoryEnsurePanel();tbHistoryPanelRender();},{once:true});else{tbHistoryEnsurePanel();tbHistoryPanelRender();}"
);

const fixedEndHistoryBeginAnchor =
  "  const token={label:String(label||'Изменение'),before:tbHistorySnapshot()};";
if(!output.includes(fixedEndHistoryBeginAnchor)){
  throw new Error("tbHistoryBegin fixed-end anchor was not found");
}
output=output.replace(
  fixedEndHistoryBeginAnchor,
  "  const token={label:String(label||'Изменение'),before:tbHistorySnapshot(),fixedEndGuard:window.TubeBenderEngineering?.captureFixedEndConstraint?.()??null};"
);

const fixedEndHistoryCommitAnchor =
  "function tbHistoryCommit(token){\n"+
  "  if(!token||tbHistory.transaction!==token)return false;\n"+
  "  const after=tbHistorySnapshot();";
if(!output.includes(fixedEndHistoryCommitAnchor)){
  throw new Error("tbHistoryCommit fixed-end anchor was not found");
}
output=output.replace(
  fixedEndHistoryCommitAnchor,
  "function tbHistoryCommit(token){\n"+
  "  if(!token||tbHistory.transaction!==token)return false;\n"+
  "  const fixedEndResult=token.fixedEndGuard?window.TubeBenderEngineering?.enforceFixedEndConstraint?.(token.fixedEndGuard):null;\n"+
  "  if(fixedEndResult?.ok===false){\n"+
  "    token.fixedEndRejected=true;\n"+
  "    tbHistory.transaction=null;\n"+
  "    tbHistoryUpdateUi();\n"+
  "    if(token?.before)tbHistoryRestore(token.before);\n"+
  "    ptToast(fixedEndResult.message||'Изменение отменено: зафиксированный конец трубы должен оставаться неподвижным');\n"+
  "    return false;\n"+
  "  }\n"+
  "  token.fixedEndAdjustedRows=fixedEndResult?.adjustedRows||[];\n"+
  "  const after=tbHistorySnapshot();"
);

const liveEditCollisionAnchor =
  "function tbModelCommand(label,mutate){";
if(!output.includes(liveEditCollisionAnchor)){
  throw new Error("tbModelCommand anchor missing for live collision guard");
}
const liveEditCollisionHelpers =
  "function tbCollisionGuardKey(item){const a=String(item?.tubeAId??''),b=String(item?.tubeBId??''),ra=Number(item?.rowA??-1),rb=Number(item?.rowB??-1);if(a===b){const lo=Math.min(ra,rb),hi=Math.max(ra,rb);return 'self:'+a+':'+lo+':'+hi;}if(a<b)return a+':'+ra+'|'+b+':'+rb;return b+':'+rb+'|'+a+':'+ra;}\n"+
  "function tbCollisionGuardSnapshot(project){const map=new Map();for(const item of getProjectCollisionAnalysis(project,true)?.collisions||[]){const key=tbCollisionGuardKey(item),penetration=Math.max(0,Number(item?.penetrationMm??item?.penetration_mm??0)||0);map.set(key,Math.max(map.get(key)||0,penetration));}return map;}\n"+
  "function tbCaptureLiveCollisionGuard(){const project=activeProject(),mode=String(project?.clearance_edit_mode||'Monitor');if(!project||!(mode==='Stop'||mode==='ValidationLock'))return null;return {projectId:project.id,mode,before:tbCollisionGuardSnapshot(project)};}\n"+
  "function tbEnforceLiveCollisionGuard(guard){if(!guard)return {ok:true};const project=(state.projects||[]).find(p=>String(p?.id)===String(guard.projectId))||activeProject();if(!project)return {ok:true};const after=tbCollisionGuardSnapshot(project),violations=[];for(const [key,penetration] of after){const previous=guard.before.get(key);if(previous===undefined||penetration>previous+0.01)violations.push({key,penetration,previous:previous??null});}return violations.length?{ok:false,mode:guard.mode,violations,message:'Изменение отменено: обнаружена новая или увеличенная коллизия'}:{ok:true,mode:guard.mode};}\n";
output=output.replace(liveEditCollisionAnchor,liveEditCollisionHelpers+liveEditCollisionAnchor);

const fixedEndCommandAnchor =
  "function tbModelCommand(label,mutate){\n"+
  "  if(typeof mutate!=='function')throw new TypeError('Model command requires a mutator');\n"+
  "  if(typeof poReadOnly==='function'&&poReadOnly()){\n"+
  "    ptToast('Проект открыт только для просмотра');\n"+
  "    tbHistoryUpdateUi();\n"+
  "    return false;\n"+
  "  }\n"+
  "  if(tbHistory.applying||tbHistory.transaction)return mutate();\n"+
  "  const token=tbHistoryBegin(label);\n"+
  "  try{\n"+
  "    const result=mutate();\n"+
  "    if(result===false){tbHistoryCancel(token);return false;}\n"+
  "    tbHistoryCommit(token);\n"+
  "    return result===undefined?true:result;\n"+
  "  }catch(error){\n"+
  "    tbHistoryCancel(token);\n"+
  "    throw error;\n"+
  "  }\n"+
  "}";
if(!output.includes(fixedEndCommandAnchor)){
  throw new Error("tbModelCommand fixed-end anchor was not found");
}
output=output.replace(
  fixedEndCommandAnchor,
  "function tbModelCommand(label,mutate){\n"+
  "  if(typeof mutate!=='function')throw new TypeError('Model command requires a mutator');\n"+
  "  if(typeof poReadOnly==='function'&&poReadOnly()){\n"+
  "    ptToast('Проект открыт только для просмотра');\n"+
  "    tbHistoryUpdateUi();\n"+
  "    return false;\n"+
  "  }\n"+
  "  if(tbHistory.applying||tbHistory.transaction)return mutate();\n"+
  "  const token=tbHistoryBegin(label);\n"+
  "  const fixedEndGuard=window.TubeBenderEngineering?.captureFixedEndConstraint?.()??null;\n"+
  "  const liveCollisionGuard=tbCaptureLiveCollisionGuard();\n"+
  "  try{\n"+
  "    const result=mutate();\n"+
  "    if(result===false){tbHistoryCancel(token);return false;}\n"+
  "    const inferredConstraintResult=window.TubeBenderConstraints?.materializeInferenceForCommand?.({label})??null;\n"+
  "    const fixedEndResult=fixedEndGuard?window.TubeBenderEngineering?.enforceFixedEndConstraint?.(fixedEndGuard):null;\n"+
  "    if(fixedEndResult?.ok===false){\n"+
  "      tbHistoryCancel(token);\n"+
  "      if(token?.before)tbHistoryRestore(token.before);\n"+
  "      ptToast(fixedEndResult.message||'Изменение отменено: зафиксированный конец трубы должен оставаться неподвижным');\n"+
  "      return false;\n"+
  "    }\n"+
  "    const liveCollisionResult=tbEnforceLiveCollisionGuard(liveCollisionGuard);\n"+
  "    if(liveCollisionResult?.ok===false){\n"+
  "      tbHistoryCancel(token);\n"+
  "      if(token?.before)tbHistoryRestore(token.before);\n"+
  "      ptToast(liveCollisionResult.message||'Изменение отменено из-за коллизии');\n"+
  "      return false;\n"+
  "    }\n"+
  "    const lockViolation=tbLockedMutationViolation(token.before,tbHistorySnapshot(),label);\n"+
  "    if(lockViolation){\n"+
  "      tbHistoryCancel(token);\n"+
  "      if(token?.before)tbHistoryRestore(token.before);\n"+
  "      ptToast(lockViolation.message||'Объект заблокирован');\n"+
  "      return false;\n"+
  "    }\n"+
  "    const geometricConstraintResult=window.TubeBenderConstraints?.validateProject?.({update:true})??{ok:true};\n"+
  "    if(geometricConstraintResult?.ok===false){\n"+
  "      tbHistoryCancel(token);\n"+
  "      if(token?.before)tbHistoryRestore(token.before);\n"+
  "      ptToast('Изменение отменено: геометрический Constraint нарушен');\n"+
  "      return false;\n"+
  "    }\n"+
  "    try{window.TubeBenderConstraints?.refreshDoF?.();window.dispatchEvent(new CustomEvent('tubebender-constraints-change'));}catch{}\n"+
  "    tbHistoryCommit(token);\n"+
  "    if(fixedEndResult?.adjustedRows?.length){try{syncActiveTubeFromState();save();renderAll();}catch{}}\n"+
  "    return result===undefined?true:result;\n"+
  "  }catch(error){\n"+
  "    tbHistoryCancel(token);\n"+
  "    throw error;\n"+
  "  }\n"+
  "}"
);

const wholeObjectCommandRuntime =
  "function tbLockGuardKind(object,parentKey=''){if(!object||typeof object!=='object')return null;if(String(object.kind||'')==='EditableMeshInstance')return 'mesh';if(parentKey==='associative_arrays')return 'array';if(Array.isArray(object.rows)&&object.id&&(object.origin||object.startAxis||object.startVector))return 'tube';return null;}\n"+
  "function tbLockGuardCollect(snapshot,{lockedOnly=true}={}){const map=new Map();const visit=(value,parentKey='')=>{if(!value||typeof value!=='object')return;if(Array.isArray(value)){for(const item of value)visit(item,parentKey);return;}const kind=tbLockGuardKind(value,parentKey),mode=String(value?.lock_state?.mode||value?.lock_mode||'Unlocked');if(kind&&value.id&&(!lockedOnly||mode==='Object'||mode==='Position'))map.set(kind+':'+String(value.id),{kind,mode,object:value});for(const [key,child] of Object.entries(value))visit(child,key);};visit(snapshot?.pipeDb??[],'pipeDb');return map;}\n"+
  "function tbLockGuardObjectComparable(object){const copy=clone(object);const scrub=(value)=>{if(!value||typeof value!=='object')return;if(Array.isArray(value)){for(const item of value)scrub(item);return;}delete value.lock_state;delete value.lock_mode;delete value.uiHiddenIn3D;delete value.uiTransparentIn3D;delete value.visible;delete value.source_visible;delete value.compare_source;for(const child of Object.values(value))scrub(child);};scrub(copy);return copy;}\n"+
  "function tbLockGuardPositionComparable(item){const object=item?.object||{};if(item?.kind==='mesh'){return {transform:{position_mm:clone(object?.transform?.position_mm??null),rotation_deg:clone(object?.transform?.rotation_deg??null),rotation_quaternion:clone(object?.transform?.rotation_quaternion??null)}};}if(item?.kind==='tube'){return {origin:clone(object?.origin??null),startVector:clone(object?.startVector??null),startAxis:object?.startAxis??null,startDir:clone(object?.startDir??null),spatialPlacement:clone(object?.importEvidence?.spatialPlacement??null)};}if(item?.kind==='array'){return {parameters:clone(object?.parameters??null)};}return null;}\n"+
  "function tbLockedMutationViolation(before,after,label){const text=String(label||'');if(text==='Lock Object'||text==='Lock Position'||text==='Разблокировать объект')return null;const beforeMap=tbLockGuardCollect(before,{lockedOnly:true}),afterMap=tbLockGuardCollect(after,{lockedOnly:false});for(const [key,item] of beforeMap){const next=afterMap.get(key);if(item.mode==='Object'){if(!next)return {key,mode:item.mode,message:'Объект заблокирован'};if(JSON.stringify(tbLockGuardObjectComparable(item.object))!==JSON.stringify(tbLockGuardObjectComparable(next.object)))return {key,mode:item.mode,message:'Объект заблокирован'};}else if(item.mode==='Position'){if(!next)continue;const a=tbLockGuardPositionComparable(item),b=tbLockGuardPositionComparable(next);if(JSON.stringify(a)!==JSON.stringify(b))return {key,mode:item.mode,message:'Объект заблокирован'};}}return null;}\n"+
  "let tbWholeObjectTransformDepth=0;\n"+
  "function tbWholeObjectCommand(label,mutate){\n"+
  "  tbWholeObjectTransformDepth+=1;\n"+
  "  try{return tbModelCommand(label,mutate);}\n"+
  "  finally{tbWholeObjectTransformDepth=Math.max(0,tbWholeObjectTransformDepth-1);}\n"+
  "}\n";
const wholeObjectCommandInsertAnchor =
  "function tbModelCommand(label,mutate){";
if(!output.includes(wholeObjectCommandInsertAnchor)){
  throw new Error("tbModelCommand runtime anchor missing");
}
output=output.replace(wholeObjectCommandInsertAnchor,wholeObjectCommandRuntime+wholeObjectCommandInsertAnchor);

const bendRotationCommitAnchor =
  "function commitBendRotationInput(input){\n"+
  "  if (!input) return false;\n"+
  "  const rowIndex = Number(input.dataset.rowIndex);\n"+
  "  const row = state.rows[rowIndex];\n"+
  "  if (!row || row.type !== 'BEND') return false;\n"+
  "  const val = evalFormula(input.value, NaN);\n"+
  "  const ok = Number.isFinite(val);\n"+
  "  setInputValidity(input, ok);\n"+
  "  if (!ok) return false;\n"+
  "  const before = analyzePipeBounds();\n"+
  "  const oldRot = row.rot, oldFormula = row.rotFormula;\n"+
  "  row.rotFormula = String(input.value ?? '').trim();\n"+
  "  row.rot = Number(val.toFixed(6));\n"+
  "  if (!validatePipeBounds(input, state.rows, state.diameterIndex, before)) { row.rot = oldRot; row.rotFormula = oldFormula; return false; }\n"+
  "  save();\n"+
  "  renderAll();\n"+
  "  return true;\n"+
  "}";
if(!output.includes(bendRotationCommitAnchor)){
  throw new Error("commitBendRotationInput anchor was not found");
}
output=output.replace(
  bendRotationCommitAnchor,
  "function commitBendRotationInput(input){\n"+
  "  if (!input) return false;\n"+
  "  const rowIndex = Number(input.dataset.rowIndex);\n"+
  "  const row = state.rows[rowIndex];\n"+
  "  if (!row || row.type !== 'BEND') return false;\n"+
  "  const sourceVal = evalFormula(input.value, NaN);\n"+
  "  const ok = Number.isFinite(sourceVal);\n"+
  "  setInputValidity(input, ok);\n"+
  "  if (!ok) return false;\n"+
  "  const val = Number(sourceVal.toFixed(2));\n"+
  "  const before = analyzePipeBounds();\n"+
  "  const oldRot = row.rot, oldFormula = row.rotFormula;\n"+
  "  row.rotFormula = val.toFixed(2);\n"+
  "  row.rot = val;\n"+
  "  input.value = row.rotFormula;\n"+
  "  if (!validatePipeBounds(input, state.rows, state.diameterIndex, before)) { row.rot = oldRot; row.rotFormula = oldFormula; return false; }\n"+
  "  save();\n"+
  "  renderAll();\n"+
  "  return true;\n"+
  "}"
);


const measurementFormulaContextAnchor =
  "function buildFormulaParameterContext(rows = state.rows){\n"+
  "  const ctx = {};";
if(!output.includes(measurementFormulaContextAnchor)){
  throw new Error("formula parameter context anchor missing for MEASURE");
}
const measurementFormulaHelper =
  "function tbMeasurementFormulaContext(){\n"+
  "  let value=NaN;\n"+
  "  try{value=Number(window.TubeBenderMeasurements?.formulaValue?.());}catch{}\n"+
  "  return Number.isFinite(value)?{MEASURE:value,measure:value}:{};\n"+
  "}\n";
output=output.replace(
  measurementFormulaContextAnchor,
  measurementFormulaHelper+
  "function buildFormulaParameterContext(rows = state.rows){\n"+
  "  const ctx = {...tbMeasurementFormulaContext()};"
);

const recalculateMeasurementContextAnchor =
  "function recalculateParameterizedRows(){\n"+
  "  rebuildStandardOffsetsForCurrentDirections();\n"+
  "  const rows = state.rows || [];\n"+
  "  let ctx = {};";
if(!output.includes(recalculateMeasurementContextAnchor)){
  throw new Error("recalculateParameterizedRows context anchor missing for MEASURE");
}
output=output.replace(
  recalculateMeasurementContextAnchor,
  "function recalculateParameterizedRows(){\n"+
  "  rebuildStandardOffsetsForCurrentDirections();\n"+
  "  const rows = state.rows || [];\n"+
  "  let ctx = {...tbMeasurementFormulaContext()};"
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

const viewerZoomWheelAnchor =
  "  wheel(e){\n    if (!this.enabled) return;\n    e.preventDefault();\n    const normalized = Math.max(-120, Math.min(120, Number(e.deltaY || 0)));\n    const factor = Math.exp(normalized * 0.0017);\n    this.zoomByFactor(factor);\n    this._suppressSelectionUntil = performance.now() + 180;\n  }";
if (!output.includes(viewerZoomWheelAnchor)) {
  throw new Error("SimpleOrbitControls wheel implementation was not found");
}
output = output.replace(
  viewerZoomWheelAnchor,
  "  wheelDeltaPixels(e){\n    const raw=Number(e?.deltaY||0);\n    if(!Number.isFinite(raw)||raw===0)return 0;\n    const mode=Number(e?.deltaMode||0);\n    if(mode===1)return raw*33;\n    if(mode===2)return raw*Math.max(180,this.domElement?.clientHeight||window.innerHeight||800);\n    return raw;\n  }\n\n  wheel(e){\n    if (!this.enabled) return;\n    e.preventDefault();\n    const pixels=this.wheelDeltaPixels(e);\n    if(!pixels)return;\n    const normalized=Math.max(-240,Math.min(240,pixels));\n    const speed=Math.max(0.1,Number(this.zoomSpeed)||1);\n    const factor=Math.exp(normalized*0.0017*speed);\n    this.zoomByFactor(factor);\n    this._suppressSelectionUntil = performance.now() + 180;\n  }"
);

const viewerZoomPerspectiveAnchor =
  "    const nextDistance = Math.max(this.minDistance, Math.min(this.maxDistance, distance * factor));\n    offset.setLength(nextDistance);\n    this.camera.position.copy(this.target).add(offset);\n    this.camera.lookAt(this.target);\n    this.camera.updateMatrixWorld(true);\n    markViewerDirty();";
if (!output.includes(viewerZoomPerspectiveAnchor)) {
  throw new Error("SimpleOrbitControls perspective zoom implementation was not found");
}
output = output.replace(
  viewerZoomPerspectiveAnchor,
  "    const nextDistance = Math.max(this.minDistance, Math.min(this.maxDistance, distance * factor));\n    if(Math.abs(nextDistance-distance)<=1e-12)return;\n    offset.setLength(nextDistance);\n    this.camera.position.copy(this.target).add(offset);\n    this.camera.near=Math.max(0.001,nextDistance/10000);\n    this.camera.far=Math.max(5000,nextDistance*10000);\n    this.camera.updateProjectionMatrix();\n    this.camera.lookAt(this.target);\n    this.camera.updateMatrixWorld(true);\n    markViewerDirty();"
);

const viewerZoomOrthoAnchor =
  "      this.camera.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.camera.zoom / factor));\n      this.camera.updateProjectionMatrix();\n      markViewerDirty();";
if (!output.includes(viewerZoomOrthoAnchor)) {
  throw new Error("SimpleOrbitControls orthographic zoom implementation was not found");
}
output = output.replace(
  viewerZoomOrthoAnchor,
  "      const previousZoom=Math.max(this.minZoom,Math.min(this.maxZoom,Number(this.camera.zoom)||1));\n      const nextZoom=Math.max(this.minZoom, Math.min(this.maxZoom, previousZoom / factor));\n      if(Math.abs(nextZoom-previousZoom)<=1e-12)return;\n      this.camera.zoom=nextZoom;\n      this.camera.updateProjectionMatrix();\n      markViewerDirty();"
);


const autodeskDownModeAnchor =
  "      this._mode = (p.pointerType === 'mouse' && (p.button === 1 || p.button === 2 || e.shiftKey)) ? 'pan' : 'rotate';";
if (!output.includes(autodeskDownModeAnchor)) {
  throw new Error("SimpleOrbitControls pointer-down mode anchor was not found");
}
output = output.replace(
  autodeskDownModeAnchor,
  "      if(p.pointerType==='mouse'){\n"+
  "        if(p.button===0)this._mode='rotate';\n"+
  "        else if(p.button===1)this._mode='pan';\n"+
  "        else this._mode='none';\n"+
  "      }else this._mode='rotate';"
);

const autodeskMoveModeAnchor =
  "    if (this._mode === 'pan' || (p.pointerType === 'mouse' && e.shiftKey)) this.pan(dx,dy);\n"+
  "    else this.rotate(dx,dy);";
if (!output.includes(autodeskMoveModeAnchor)) {
  throw new Error("SimpleOrbitControls pointer-move mode anchor was not found");
}
output = output.replace(
  autodeskMoveModeAnchor,
  "    if(p.pointerType==='mouse'){\n"+
  "      if(p.button===0)this._mode='rotate';\n"+
  "      else if(p.button===1)this._mode='pan';\n"+
  "    }\n"+
  "    if(this._mode==='pan')this.pan(dx,dy);\n"+
  "    else if(this._mode==='rotate'){\n"+
  "      if(p.pointerType==='mouse')this.rotate(dx,-dy);\n"+
  "      else this.rotate(dx,dy);\n"+
  "    }"
);

const autodeskRemainingModeAnchor =
  "      this._mode = remaining.pointerType === 'mouse' && (remaining.button === 1 || remaining.button === 2) ? 'pan' : 'rotate';";
if (!output.includes(autodeskRemainingModeAnchor)) {
  throw new Error("SimpleOrbitControls remaining-pointer mode anchor was not found");
}
output = output.replace(
  autodeskRemainingModeAnchor,
  "      if(remaining.pointerType==='mouse'){\n"+
  "        if(remaining.button===0)this._mode='rotate';\n"+
  "        else if(remaining.button===1)this._mode='pan';\n"+
  "        else this._mode='none';\n"+
  "      }else this._mode='rotate';"
);

const resizeFitAnchor =
  "  camera.updateProjectionMatrix();\n  renderer.setSize(w, h, false);\n  fitPipeToViewerKeepOrbit();\n}\nfunction animate(){";
if (!output.includes(resizeFitAnchor)) {
  throw new Error("viewer resize auto-fit implementation was not found");
}
output = output.replace(
  resizeFitAnchor,
  "  camera.updateProjectionMatrix();\n  renderer.setSize(w, h, false);\n  // Preserve user camera zoom/orbit on viewport or browser-scale changes.\n  // Initial/view-orientation fitting is invoked explicitly by its callers.\n  markViewerDirty();\n}\nfunction animate(){"
);


const windowControlsRepairAnchor =
  "  function ensureWindowControls(){\n"+
  "    const h=document.querySelector('.tb-map-header');\n"+
  "    if(!h||document.getElementById('tbWindowControls'))return;\n"+
  "    const c=document.createElement('div');c.id='tbWindowControls';c.className='tb-window-controls';";
if (!output.includes(windowControlsRepairAnchor)) {
  throw new Error("VC207R7 ensureWindowControls anchor was not found");
}
output = output.replace(
  windowControlsRepairAnchor,
  "  function ensureWindowControls(){\n"+
  "    const h=document.querySelector('.tb-map-header');\n"+
  "    if(!h)return;\n"+
  "    let c=document.getElementById('tbWindowControls');\n"+
  "    if(!c){c=document.createElement('div');c.id='tbWindowControls';c.className='tb-window-controls';"
);

const windowControlsCreationTail =
  "    c.innerHTML='<button class=\"tb-window-control\" id=\"tbWinMin\" title=\"Свернуть\">−</button><button class=\"tb-window-control\" id=\"tbWinMax\" title=\"Во весь экран\">□</button><button class=\"tb-window-control close\" id=\"tbWinClose\" title=\"Закрыть\">×</button>';\n"+
  "    h.appendChild(c);\n"+
  "    document.getElementById('tbWinMin').onclick=()=>toast('В браузерной версии сворачивание выполняется средствами окна браузера');";
if (!output.includes(windowControlsCreationTail)) {
  throw new Error("VC207R7 window-controls creation tail was not found");
}
output = output.replace(
  windowControlsCreationTail,
  "    c.innerHTML='<button class=\"tb-window-control\" id=\"tbWinMin\" title=\"Свернуть\">−</button><button class=\"tb-window-control\" id=\"tbWinMax\" title=\"Во весь экран\">□</button><button class=\"tb-window-control close\" id=\"tbWinClose\" title=\"Закрыть\">×</button>';\n"+
  "    }\n"+
  "    if(c.parentElement!==h||h.lastElementChild!==c)h.appendChild(c);\n"+
  "    document.getElementById('tbWinMin').onclick=()=>toast('В браузерной версии сворачивание выполняется средствами окна браузера');"
);

const exactStartVectorStateAnchor =
  "  startDir: { az: 0, el: 0 },\n  startAxis: 'X',";
if (!output.includes(exactStartVectorStateAnchor)) {
  throw new Error("viewer state startDir/startAxis anchor was not found");
}
output = output.replace(
  exactStartVectorStateAnchor,
  "  startDir: { az: 0, el: 0 },\n  startVector: null,\n  startAxis: 'X',"
);

const exactStartVectorEnsureAnchor =
  "  if (!state.startDir || typeof state.startDir !== 'object') state.startDir = {};";
if (!output.includes(exactStartVectorEnsureAnchor)) {
  throw new Error("ensureBoxAndOriginState startDir anchor was not found");
}
output = output.replace(
  exactStartVectorEnsureAnchor,
  exactStartVectorEnsureAnchor +
  "\n  if (state.startVector && typeof state.startVector === 'object') {\n" +
  "    const sxv=Number(state.startVector.x),syv=Number(state.startVector.y),szv=Number(state.startVector.z);\n" +
  "    const sl=Math.hypot(sxv,syv,szv);\n" +
  "    state.startVector=sl>1e-12&&[sxv,syv,szv].every(Number.isFinite)\n" +
  "      ? {x:sxv/sl,y:syv/sl,z:szv/sl}\n" +
  "      : null;\n" +
  "  } else state.startVector=null;"
);

const exactStartVectorActiveAnchor =
`function startDirectionVector(){
  const d = startAxisAngleState();`;
if (!output.includes(exactStartVectorActiveAnchor)) {
  throw new Error("startDirectionVector anchor was not found");
}
output = output.replace(
  exactStartVectorActiveAnchor,
`function startDirectionVector(){
  const sv=state.startVector;
  if(sv&&[sv.x,sv.y,sv.z].every(Number.isFinite)){
    const exact=new THREE.Vector3(Number(sv.x),Number(sv.y),Number(sv.z));
    if(exact.lengthSq()>1e-12)return exact.normalize();
  }
  const d = startAxisAngleState();`
);

const exactStartVectorTubeAnchor =
`function tubeStartDirectionVector(tube){
  const axis=['X','-X','Y','-Y','Z','-Z'].includes(tube?.startAxis)?tube.startAxis:'X';`;
if (!output.includes(exactStartVectorTubeAnchor)) {
  throw new Error("tubeStartDirectionVector anchor was not found");
}
output = output.replace(
  exactStartVectorTubeAnchor,
`function tubeStartDirectionVector(tube){
  const sv=tube?.startVector;
  if(sv&&[sv.x,sv.y,sv.z].every(Number.isFinite)){
    const exact=new THREE.Vector3(Number(sv.x),Number(sv.y),Number(sv.z));
    if(exact.lengthSq()>1e-12)return exact.normalize();
  }
  const axis=['X','-X','Y','-Y','Z','-Z'].includes(tube?.startAxis)?tube.startAxis:'X';`
);

const exactStartVectorSyncAnchor =
  "  t.startDir = clone(state.startDir || { az:0, el:0 });\n  t.startAxis = importBlocked";
if (!output.includes(exactStartVectorSyncAnchor)) {
  throw new Error("syncActiveTubeFromState startDir anchor was not found");
}
output = output.replace(
  exactStartVectorSyncAnchor,
  "  t.startDir = clone(state.startDir || { az:0, el:0 });\n" +
  "  t.startVector = state.startVector ? clone(state.startVector) : null;\n" +
  "  t.startAxis = importBlocked"
);

const exactStartVectorLoadAnchor =
  "  state.startDir = (t.startDir && typeof t.startDir === 'object') ? clone(t.startDir) : { az:0, el:0 };\n  state.startAxis = importBlocked";
if (!output.includes(exactStartVectorLoadAnchor)) {
  throw new Error("loadActiveTubeToState startDir anchor was not found");
}
output = output.replace(
  exactStartVectorLoadAnchor,
  "  state.startDir = (t.startDir && typeof t.startDir === 'object') ? clone(t.startDir) : { az:0, el:0 };\n" +
  "  state.startVector = (t.startVector && typeof t.startVector === 'object') ? clone(t.startVector) : null;\n" +
  "  state.startAxis = importBlocked"
);

const exactStartVectorCollisionAnchor =
  "    snap.origin=clone(state.origin||{x:0,y:0,z:0});\n    snap.startAxis=state.startAxis||'X';";
if (!output.includes(exactStartVectorCollisionAnchor)) {
  throw new Error("collisionTubeSnapshot origin anchor was not found");
}
output = output.replace(
  exactStartVectorCollisionAnchor,
  "    snap.origin=clone(state.origin||{x:0,y:0,z:0});\n" +
  "    snap.startVector=state.startVector?clone(state.startVector):null;\n" +
  "    snap.startAxis=state.startAxis||'X';"
);

const exactStartVectorSignatureAnchor =
  "      origin:x?.origin,startAxis:x?.startAxis,startPlane:x?.startPlane,\n      startAngle:x?.startAngle,";
if (!output.includes(exactStartVectorSignatureAnchor)) {
  throw new Error("projectCollisionSignature start pose anchor was not found");
}
output = output.replace(
  exactStartVectorSignatureAnchor,
  "      origin:x?.origin,startVector:x?.startVector,startAxis:x?.startAxis,startPlane:x?.startPlane,\n" +
  "      startAngle:x?.startAngle,"
);

const exactStartVectorSetAnchor =
  "  state.startPlane = bestPlane;\n  state.startAxis = best?.token || 'X';\n  state.startAngle = normalizeSignedDeg(best?.angle || 0);\n}";
if (!output.includes(exactStartVectorSetAnchor)) {
  throw new Error("setStartDirectionFromWorldVector result anchor was not found");
}
output = output.replace(
  exactStartVectorSetAnchor,
  "  state.startPlane = bestPlane;\n" +
  "  state.startAxis = best?.token || 'X';\n" +
  "  state.startAngle = normalizeSignedDeg(best?.angle || 0);\n" +
  "  state.startVector = {x:dir.x,y:dir.y,z:dir.z};\n" +
  "}"
);

const importedDiameterResolverAnchor =
`function validToolDiameterIndex(preferredIndex){
  if (!Array.isArray(pipeDb) || !pipeDb.length) return 0;
  const i = Number(preferredIndex);
  if (Number.isInteger(i) && pipeDb[i]) return i;
  let by22 = pipeDb.findIndex(p => Math.abs(Number(p.mm) - 22) < 0.001);
  if (by22 >= 0) return by22;
  return 0;
}`;
if (!output.includes(importedDiameterResolverAnchor)) {
  throw new Error("validToolDiameterIndex implementation was not found");
}
output = output.replace(
  importedDiameterResolverAnchor,
`function importedDiameterIndexFromEvidence(tube,db=pipeDb){
  if(!Array.isArray(db)||!db.length)return -1;
  const evidence=tube?.importEvidence||{};
  const targets=[
    evidence?.diameterNormalization?.table_outer_diameter_mm,
    evidence?.recognitionSummary?.dimension_reconciliation?.derived_outer_diameter_mm,
    evidence?.metadata?.outer_diameter_mm,
    evidence?.metadata?.outer_diameter?.value
  ];
  for(const candidate of targets){
    const target=Number(candidate);
    if(!(Number.isFinite(target)&&target>0))continue;
    let best=-1,bestError=Infinity;
    db.forEach((p,index)=>{
      const mm=Number(p?.mm);
      if(!(Number.isFinite(mm)&&mm>0))return;
      const error=Math.abs(mm-target);
      if(error<bestError-1e-12){
        best=index;
        bestError=error;
      }
    });
    if(best>=0)return best;
  }
  const raw=tube?.diameterIndex;
  if(raw!==null&&raw!==undefined&&raw!==''){
    const i=Number(raw);
    if(Number.isInteger(i)&&i>=0&&db[i])return i;
  }
  return -1;
}
function validToolDiameterIndex(preferredIndex){
  if (!Array.isArray(pipeDb) || !pipeDb.length) return 0;
  if(preferredIndex!==null&&preferredIndex!==undefined&&preferredIndex!==''){
    const i = Number(preferredIndex);
    if (Number.isInteger(i) && pipeDb[i]) return i;
  }
  let by22 = pipeDb.findIndex(p => Math.abs(Number(p.mm) - 22) < 0.001);
  if (by22 >= 0) return by22;
  return 0;
}`
);

const importedRepairAnchor =
`  if(t.importValidation?.productionBlocked===true){
    t.visible=t.visible!==false;
    return t;
  }`;
if (!output.includes(importedRepairAnchor)) {
  throw new Error("repairTubeForCheck imported branch was not found");
}
output = output.replace(
  importedRepairAnchor,
`  if(t.importValidation?.productionBlocked===true){
    const importedIndex=importedDiameterIndexFromEvidence(t,pipeDb);
    if(importedIndex>=0)t.diameterIndex=importedIndex;
    t.toolingId=null;
    t.toolingUnresolved=true;
    t.visible=t.visible!==false;
    return t;
  }`
);

const importedLoadAnchor =
`  const importBlocked=t.importValidation?.productionBlocked===true;
  let resolved=toolingIndexById(t.toolingId);
  if(resolved<0&&!t.toolingId&&!importBlocked){
    resolved=validToolDiameterIndex(t.diameterIndex);
    t.toolingId=pipeDb[resolved]?.id||null;
  }
  if(resolved<0){
    t.toolingUnresolved=true;
    resolved=validToolDiameterIndex(t.diameterIndex);
  }else{
    t.toolingUnresolved=false;
  }
  state.diameterIndex=resolved;
  state.toolingId=t.toolingId||(importBlocked?null:(pipeDb[resolved]?.id||null));
  state.toolingUnresolved=t.toolingUnresolved;`;
if (!output.includes(importedLoadAnchor)) {
  throw new Error("loadActiveTubeToState tooling block was not found");
}
output = output.replace(
  importedLoadAnchor,
`  const importBlocked=t.importValidation?.productionBlocked===true;
  if(importBlocked){
    const importedIndex=importedDiameterIndexFromEvidence(t,pipeDb);
    const resolved=importedIndex>=0
      ? importedIndex
      : validToolDiameterIndex(t.diameterIndex);
    t.diameterIndex=resolved;
    t.toolingId=null;
    t.toolingUnresolved=true;
    state.diameterIndex=resolved;
    state.toolingId=null;
    state.toolingUnresolved=true;
  }else{
    let resolved=toolingIndexById(t.toolingId);
    if(resolved<0&&!t.toolingId){
      resolved=validToolDiameterIndex(t.diameterIndex);
      t.toolingId=pipeDb[resolved]?.id||null;
    }
    if(resolved<0){
      t.toolingUnresolved=true;
      resolved=validToolDiameterIndex(t.diameterIndex);
    }else{
      t.toolingUnresolved=false;
    }
    state.diameterIndex=resolved;
    state.toolingId=t.toolingId||(pipeDb[resolved]?.id||null);
    state.toolingUnresolved=t.toolingUnresolved;
  }`
);

const importedSyncAnchor =
`  const importBlocked=t.importValidation?.productionBlocked===true;
  const resolved=toolingIndexById(state.toolingId);
  if(resolved>=0)state.diameterIndex=resolved;
  if(!state.toolingId&&!importBlocked){
    const tool=pipeDb[state.diameterIndex];
    if(tool?.id)state.toolingId=tool.id;
  }
  t.toolingId=state.toolingId||null;
  t.toolingUnresolved=toolingIndexById(t.toolingId)<0;
  t.diameterIndex = state.diameterIndex;
  state.toolingUnresolved=t.toolingUnresolved;`;
if (!output.includes(importedSyncAnchor)) {
  throw new Error("syncActiveTubeFromState tooling block was not found");
}
output = output.replace(
  importedSyncAnchor,
`  const importBlocked=t.importValidation?.productionBlocked===true;
  const resolved=toolingIndexById(state.toolingId);
  if(importBlocked){
    const importedIndex=importedDiameterIndexFromEvidence(t,pipeDb);
    state.diameterIndex=importedIndex>=0
      ? importedIndex
      : validToolDiameterIndex(t.diameterIndex);
    state.toolingId=null;
    t.toolingId=null;
    t.toolingUnresolved=true;
    state.toolingUnresolved=true;
  }else{
    if(resolved>=0)state.diameterIndex=resolved;
    if(!state.toolingId){
      const tool=pipeDb[state.diameterIndex];
      if(tool?.id)state.toolingId=tool.id;
    }
    t.toolingId=state.toolingId||null;
    t.toolingUnresolved=toolingIndexById(t.toolingId)<0;
    state.toolingUnresolved=t.toolingUnresolved;
  }
  t.diameterIndex = state.diameterIndex;`
);

const importedRenderSelectAnchor =
`  const active = activeTube();
  if(active){
    if(!active.toolingId){
      const legacy=pipeDb[validToolDiameterIndex(active.diameterIndex)];
      if(legacy?.id)active.toolingId=legacy.id;
    }
    const idx=toolingIndexById(active.toolingId);
    if(idx>=0){
      active.diameterIndex=idx;
      active.toolingUnresolved=false;
      state.diameterIndex=idx;
      state.toolingId=active.toolingId;
      state.toolingUnresolved=false;
    }else{
      active.toolingUnresolved=true;
      state.toolingId=active.toolingId||state.toolingId;
      state.toolingUnresolved=true;
    }
  }else{`;
if (!output.includes(importedRenderSelectAnchor)) {
  throw new Error("renderPipeSelect active block was not found");
}
output = output.replace(
  importedRenderSelectAnchor,
`  const active = activeTube();
  if(active){
    const importBlocked=active.importValidation?.productionBlocked===true;
    if(importBlocked){
      const idx=importedDiameterIndexFromEvidence(active,pipeDb);
      if(idx>=0){
        active.diameterIndex=idx;
        state.diameterIndex=idx;
      }
      active.toolingId=null;
      active.toolingUnresolved=true;
      state.toolingId=null;
      state.toolingUnresolved=true;
    }else{
      if(!active.toolingId){
        const legacy=pipeDb[validToolDiameterIndex(active.diameterIndex)];
        if(legacy?.id)active.toolingId=legacy.id;
      }
      const idx=toolingIndexById(active.toolingId);
      if(idx>=0){
        active.diameterIndex=idx;
        active.toolingUnresolved=false;
        state.diameterIndex=idx;
        state.toolingId=active.toolingId;
        state.toolingUnresolved=false;
      }else{
        active.toolingUnresolved=true;
        state.toolingId=active.toolingId||state.toolingId;
        state.toolingUnresolved=true;
      }
    }
  }else{`
);

const stateToolingFallback =
`  if(!state.toolingId){
    const legacy=pipeDb[Number(state.diameterIndex)];
    if(legacy?.id)state.toolingId=legacy.id;
  }`;
if (!output.includes(stateToolingFallback)) {
  throw new Error("state tooling fallback was not found");
}
output = output.replaceAll(
  stateToolingFallback,
`  const activeRecordForTooling=allTubeRecords().find(t=>t?.id===state.activeTubeId);
  const activeImportBlocked=activeRecordForTooling?.importValidation?.productionBlocked===true;
  if(!state.toolingId&&!activeImportBlocked){
    const legacy=pipeDb[Number(state.diameterIndex)];
    if(legacy?.id)state.toolingId=legacy.id;
  }`
);

const poValidationAnchor =
`  t.importValidation={...priorImportValidation,productionBlocked:false,issues:[]};`;
if (!output.includes(poValidationAnchor)) {
  throw new Error("poNormalizeTube validation reset was not found");
}
output = output.replace(
  poValidationAnchor,
`  const priorIssues=Array.isArray(priorImportValidation.issues)
    ? [...priorImportValidation.issues]
    : [];
  t.importValidation={
    ...priorImportValidation,
    productionBlocked:priorImportValidation.productionBlocked===true,
    issues:priorIssues
  };`
);

const poDiameterAnchor =
`  if(!Number.isInteger(Number(t.diameterIndex)))t.diameterIndex=null;
  else t.diameterIndex=Number(t.diameterIndex);`;
if (!output.includes(poDiameterAnchor)) {
  throw new Error("poNormalizeTube diameter normalization anchor was not found");
}
output = output.replace(
  poDiameterAnchor,
`  if(
    t.diameterIndex===null||
    t.diameterIndex===undefined||
    t.diameterIndex===''||
    !Number.isInteger(Number(t.diameterIndex))
  )t.diameterIndex=null;
  else t.diameterIndex=Number(t.diameterIndex);
  const importedDwfx=String(t.importEvidence?.source?.format??'').toLowerCase()==='dwfx';
  if(importedDwfx){
    const importedIndex=importedDiameterIndexFromEvidence(t,pkg?.pipeDb);
    if(importedIndex>=0)t.diameterIndex=importedIndex;
    t.toolingId=null;
    t.toolingUnresolved=true;
    t.importValidation.productionBlocked=true;
  }`
);

const poToolAnchor =
`  const tool=poToolFor(t,pkg);
  if(!tool){
    t.toolingUnresolved=true;
    block('оснастка не разрешена точно; первая или ближайшая оснастка не подставляется.');
  }else{
    t.toolingUnresolved=false;
    if(!t.toolingId&&tool.id)t.toolingId=tool.id;
    const legacyTubeBenderVersion=/^VC\\d+/i.test(String(pkg?.version||''));`;
if (!output.includes(poToolAnchor)) {
  throw new Error("poNormalizeTube tooling block was not found");
}
output = output.replace(
  poToolAnchor,
`  const tool=poToolFor(t,pkg);
  if(!tool){
    t.toolingUnresolved=true;
    block('оснастка не разрешена точно; первая или ближайшая оснастка не подставляется.');
  }else{
    if(importedDwfx){
      t.toolingUnresolved=true;
      t.toolingId=null;
    }else{
      t.toolingUnresolved=false;
      if(!t.toolingId&&tool.id)t.toolingId=tool.id;
    }
    const legacyTubeBenderVersion=/^VC\\d+/i.test(String(pkg?.version||''));`
);

const poStartDirectionAnchor =
`  let dir=poAxisVector(tube?.startAxis);
  if(!dir)return unresolved('start axis is unsupported',{tool});
  const startPlane=tube?.startPlane;
  const startNormal=poPlaneNormal(startPlane);
  if(!startNormal)return unresolved('start plane is unsupported',{tool});
  dir.applyAxisAngle(startNormal,THREE.MathUtils.degToRad(Number(tube?.startAngle)||0)).normalize();`;
if (!output.includes(poStartDirectionAnchor)) {
  throw new Error("poBuildTubePath start direction block was not found");
}
output = output.replace(
  poStartDirectionAnchor,
`  let dir=null;
  const sv=tube?.startVector;
  if(
    sv&&
    [sv.x,sv.y,sv.z].every(Number.isFinite)&&
    Math.hypot(Number(sv.x),Number(sv.y),Number(sv.z))>1e-12
  ){
    dir=new THREE.Vector3(Number(sv.x),Number(sv.y),Number(sv.z)).normalize();
  }else{
    dir=poAxisVector(tube?.startAxis);
    if(!dir)return unresolved('start axis is unsupported',{tool});
    const startPlane=tube?.startPlane;
    const startNormal=poPlaneNormal(startPlane);
    if(!startNormal)return unresolved('start plane is unsupported',{tool});
    dir.applyAxisAngle(startNormal,THREE.MathUtils.degToRad(Number(tube?.startAngle)||0)).normalize();
  }`
);

const importedOriginRepairAnchor =
  "function validToolDiameterIndex(preferredIndex){";
if (!output.includes(importedOriginRepairAnchor)) {
  throw new Error("validToolDiameterIndex anchor for imported origin repair was not found");
}
const importedOriginHelpers = `
function importedSpatialOriginFromEvidence(tube){
  const spatial=tube?.importEvidence?.spatialPlacement;
  const normalized=tube?.importEvidence?.linearDimensionNormalization;
  const raw=
    spatial?.editable_origin_mm ??
    normalized?.editable_origin_mm ??
    spatial?.origin_mm;
  if(
    spatial?.status!=='exact'||
    !Array.isArray(raw)||
    raw.length!==3
  )return null;
  const values=raw.map(Number);
  return values.every(Number.isFinite)
    ? {x:values[0],y:values[1],z:values[2]}
    : null;
}
function restoreImportedSpatialOrigin(tube,{force=false}={}){
  if(!tube||typeof tube!=='object')return false;
  const spatial=tube?.importEvidence?.spatialPlacement;
  if(spatial?.user_origin_override===true&&!force)return false;
  const origin=importedSpatialOriginFromEvidence(tube);
  if(!origin)return false;
  tube.origin=clone(origin);
  tube.importEvidence={
    ...(tube.importEvidence||{}),
    spatialPlacement:{
      ...(spatial||{}),
      editable_origin_seeded:true,
      user_origin_override:spatial?.user_origin_override===true
    }
  };
  return true;
}
function markImportedOriginOverride(tube=activeTube()){
  const spatial=tube?.importEvidence?.spatialPlacement;
  if(!tube||spatial?.status!=='exact')return false;
  tube.importEvidence={
    ...(tube.importEvidence||{}),
    spatialPlacement:{
      ...(spatial||{}),
      editable_origin_seeded:true,
      user_origin_override:true
    }
  };
  return true;
}
`;
output = output.replace(
  importedOriginRepairAnchor,
  importedOriginHelpers + "\n" + importedOriginRepairAnchor
);

const importedRepairBranch =
  "  if(t.importValidation?.productionBlocked===true){\n    const importedIndex=importedDiameterIndexFromEvidence(t,pipeDb);";
if (!output.includes(importedRepairBranch)) {
  throw new Error("repairTubeForCheck imported branch missing");
}
output = output.replace(
  importedRepairBranch,
  "  if(t.importValidation?.productionBlocked===true){\n    restoreImportedSpatialOrigin(t);\n    const importedIndex=importedDiameterIndexFromEvidence(t,pipeDb);"
);

const importedOriginBranchNeedle =
  "  if(importBlocked){\n    const importedIndex=importedDiameterIndexFromEvidence(t,pipeDb);";

const syncFunctionStart=output.indexOf("function syncActiveTubeFromState(){");
const syncBranchStart=output.indexOf(importedOriginBranchNeedle,syncFunctionStart);
if(syncFunctionStart<0||syncBranchStart<0){
  throw new Error("syncActiveTubeFromState imported branch missing");
}
output =
  output.slice(0,syncBranchStart)+
  "  if(importBlocked){\n    if(t?.importEvidence?.spatialPlacement?.user_origin_override!==true){\n      restoreImportedSpatialOrigin(t);\n      if(t.origin&&typeof t.origin==='object')state.origin=clone(t.origin);\n    }\n    const importedIndex=importedDiameterIndexFromEvidence(t,pipeDb);"+
  output.slice(syncBranchStart+importedOriginBranchNeedle.length);

const loadFunctionStart=output.indexOf("function loadActiveTubeToState(){");
const loadBranchStart=output.indexOf(importedOriginBranchNeedle,loadFunctionStart);
if(loadFunctionStart<0||loadBranchStart<0){
  throw new Error("loadActiveTubeToState imported branch missing");
}
output =
  output.slice(0,loadBranchStart)+
  "  if(importBlocked){\n    restoreImportedSpatialOrigin(t);\n    const importedIndex=importedDiameterIndexFromEvidence(t,pipeDb);"+
  output.slice(loadBranchStart+importedOriginBranchNeedle.length);

const poImportedDwfxBlock =
  "  if(importedDwfx){\n    const importedIndex=importedDiameterIndexFromEvidence(t,pkg?.pipeDb);";
if (!output.includes(poImportedDwfxBlock)) {
  throw new Error("poNormalizeTube imported DWFx branch missing");
}
output = output.replace(
  poImportedDwfxBlock,
  "  if(importedDwfx){\n    restoreImportedSpatialOrigin(t);\n    const importedIndex=importedDiameterIndexFromEvidence(t,pkg?.pipeDb);"
);


const preserveViewerFrameCanvasAnchor =
  "function onCanvasClick(event){\n  if (controls?.shouldSuppressSelection?.()) return;";
if (!output.includes(preserveViewerFrameCanvasAnchor)) {
  throw new Error("3D canvas selection handler anchor was not found");
}
output = output.replace(
  preserveViewerFrameCanvasAnchor,
  "let preserveViewerFrameForCanvasInteraction=false;\n"+
  "function onCanvasClick(event){\n"+
  "  preserveViewerFrameForCanvasInteraction=true;\n"+
  "  queueMicrotask(()=>{preserveViewerFrameForCanvasInteraction=false;});\n"+
  "  if (controls?.shouldSuppressSelection?.()) return;"
);

const renderAllViewerFitAnchor =
  "  safeUiCall('renderViewerOnly', ()=>renderViewerOnly(true));";
if (!output.includes(renderAllViewerFitAnchor)) {
  throw new Error("renderAll viewer auto-fit anchor was not found");
}
output = output.replace(
  renderAllViewerFitAnchor,
  "  safeUiCall('renderViewerOnly', ()=>renderViewerOnly(!preserveViewerFrameForCanvasInteraction));"
);

const originEditorHandler =
  "state.origin[a]=v;if(!validatePipeBounds(inp,rowsForStartPointValidation(),state.diameterIndex,before)){state.origin[a]=old;renderAll();return;}syncActiveTubeFromState();save();renderAll();";
if (!output.includes(originEditorHandler)) {
  throw new Error("Project Map origin editor handler missing");
}
output = output.replace(
  originEditorHandler,
  "state.origin[a]=v;if(!validatePipeBounds(inp,rowsForStartPointValidation(),state.diameterIndex,before)){state.origin[a]=old;renderAll();return;}markImportedOriginOverride(activeTube());syncActiveTubeFromState();save();renderAll();"
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


const invalidLabelAnchor =
  "  qs('viewer').appendChild(el);\n"+
  "  labels.push({ el, pos: pos.clone(), rowIndex, field });";
if(!output.includes(invalidLabelAnchor)){
  throw new Error("tube element label anchor was not found");
}
output=output.replace(
  invalidLabelAnchor,
  "  const invalidIssues=tubeRowValidationIssues(activeTube(),rowIndex);\n"+
  "  if(invalidIssues.length){\n"+
  "    el.classList.add('tb-invalid-tube-element');\n"+
  "    el.dataset.invalid='true';\n"+
  "    el.title=(el.title?el.title+'\\n':'')+invalidIssues.join('\\n');\n"+
  "  }\n"+
  "  qs('viewer').appendChild(el);\n"+
  "  labels.push({ el, pos: pos.clone(), rowIndex, field });"
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
  `\n  try{\n    window.TubeBenderReferenceSceneUi?.bindTree?.(host,p,{
      switchTube,
      save,
      renderAll,
      refreshProjectTree,
      modelCommand:tbModelCommand,
      reloadActiveTube:()=>{loadActiveTubeToState();renderPipeTable();}
    });\n  }catch(error){\n    console.warn("DWFx reference tree binding:",error);\n  }`
);

const invalidTreeRowsAnchor =
  "  host.querySelectorAll('[data-tree-tube]').forEach(n=>n.addEventListener('click',()=>switchTube(n.dataset.treeTube)));";
if(!output.includes(invalidTreeRowsAnchor)){
  throw new Error("Project tree row decoration anchor was not found");
}
output=output.replace(
  invalidTreeRowsAnchor,
  "  host.querySelectorAll('[data-tree-tube]').forEach(n=>{\n"+
  "    const tube=(p?.tubes??[]).find(item=>String(item?.id)===String(n.dataset.treeTube));\n"+
  "    if(!tube)return;\n"+
  "    const summary=tubeValidationSummary(tube);\n"+
  "    const label=n.querySelector('.tb-tree-label');\n"+
  "    const dot=document.createElement('span');\n"+
  "    dot.className='tb-tube-status-dot '+(summary.valid?'ok':'problem');\n"+
  "    dot.dataset.tubeStatus=summary.valid?'ok':'problem';\n"+
  "    dot.setAttribute('aria-label',summary.valid?'Все элементы трубы корректны':'Есть проблемные элементы трубы');\n"+
  "    dot.title=summary.valid\n"+
  "      ?'Все элементы трубы корректны'\n"+
  "      :'Проблемных элементов: '+summary.invalidRowCount+(summary.issues.length?'\\n'+summary.issues.join('\\n'):'');\n"+
  "    if(label)n.insertBefore(dot,label);else n.appendChild(dot);\n"+
  "  });\n"+
  "  host.querySelectorAll('[data-tree-row],[data-tree-assembly-part]').forEach(n=>{\n"+
  "    const rowIndex=Number(n.dataset.treeRow??n.dataset.treeRowRef);\n"+
  "    if(!Number.isInteger(rowIndex)||rowIndex<0)return;\n"+
  "    const issues=tubeRowValidationIssues(activeTube(),rowIndex);\n"+
  "    n.classList.toggle('tb-invalid-tube-element',issues.length>0);\n"+
  "    if(issues.length)n.title=issues.join('\\n');\n"+
  "  });\n"+
  invalidTreeRowsAnchor
);





/* A65: end straight segments may be shorter than Lmin.
   Manufacturing/bending-card data adds explicit removable technological
   allowances without changing the nominal finished-part geometry. */
const endStraightHelperAnchor =
  "function minStraight(){\n"+
  "  const p=pipe();\n"+
  "  const technologicalLmin=Number(p?.Lmin);\n"+
  "  return Number.isFinite(technologicalLmin)&&technologicalLmin>=0 ? technologicalLmin : 0;\n"+
  "}";
if(!output.includes(endStraightHelperAnchor)){
  throw new Error("minStraight helper anchor was not found");
}
output=output.replace(
  endStraightHelperAnchor,
  endStraightHelperAnchor+"\n"+
  "function straightRowIndexes(rows){\n"+
  "  const out=[];\n"+
  "  (Array.isArray(rows)?rows:[]).forEach((row,index)=>{if(row?.type==='LINE')out.push(index);});\n"+
  "  return out;\n"+
  "}\n"+
  "function isEndStraightRowIndex(rows,rowIndex){\n"+
  "  const indexes=straightRowIndexes(rows);\n"+
  "  const index=Number(rowIndex);\n"+
  "  return indexes.length>0&&(index===indexes[0]||index===indexes[indexes.length-1]);\n"+
  "}\n"+
  "function technologicalEndAllowancePlan(tube=activeTube(),options={}){\n"+
  "  const rows=tube?.id===state.activeTubeId?(state.rows||[]):(tube?.rows||[]);\n"+
  "  const indexes=straightRowIndexes(rows);\n"+
  "  const firstIndex=indexes[0]??-1,lastIndex=indexes.length?indexes[indexes.length-1]:-1;\n"+
  "  const firstActual=firstIndex>=0?Math.max(0,Number(rows[firstIndex]?.L)||0):0;\n"+
  "  const lastActual=lastIndex>=0?Math.max(0,Number(rows[lastIndex]?.L)||0):0;\n"+
  "  const tool=pipeAt(tube?.diameterIndex)??{};\n"+
  "  const nonNegative=value=>{const n=Number(value);return Number.isFinite(n)&&n>0?n:0;};\n"+
  "  const tableLmin=nonNegative(tool?.Lmin);\n"+
  "  const styleLmin=nonNegative(options?.minimumStraight);\n"+
  "  const clampMin=nonNegative(options?.clampMin);\n"+
  "  const hasBends=(rows||[]).some(row=>row?.type==='BEND');\n"+
  "  const minFeed=hasBends?nonNegative(options?.minFeed):0;\n"+
  "  const startRequired=Math.max(tableLmin,styleLmin,clampMin,minFeed);\n"+
  "  const endRequired=Math.max(tableLmin,styleLmin,clampMin);\n"+
  "  const startAllowance=Math.max(0,startRequired-firstActual);\n"+
  "  const endAllowance=Math.max(0,endRequired-lastActual);\n"+
  "  return {\n"+
  "    firstRowIndex:firstIndex,lastRowIndex:lastIndex,\n"+
  "    firstActual,lastActual,startRequired,endRequired,\n"+
  "    startAllowance,endAllowance,totalAllowance:startAllowance+endAllowance,\n"+
  "    effectiveStart:firstActual+startAllowance,\n"+
  "    effectiveEnd:lastActual+endAllowance,\n"+
  "    tableLmin,styleLmin,clampMin,minFeed,\n"+
  "    hasStartAllowance:startAllowance>1e-6,\n"+
  "    hasEndAllowance:endAllowance>1e-6,\n"+
  "    removableAfterBending:true,\n"+
  "    nominalGeometryChanged:false\n"+
  "  };\n"+
  "}"
);

const firstStraightDraftMinAnchor =
  "  const min = minStraight();\n"+
  "  if (value < min) return { ok:false, empty:false, value, formula, message:`Минимальная длина — ${fmt(min,1)} мм` };";
if(!output.includes(firstStraightDraftMinAnchor)){
  throw new Error("first segment Lmin validation anchor was not found");
}
output=output.replace(firstStraightDraftMinAnchor,"");

const startPointRowsAnchor =
  "  if(!formula||!Number.isFinite(value)||value<=0||value<minStraight()||value>MAX_STOCK_LENGTH+1e-6) return [];";
if(!output.includes(startPointRowsAnchor)){
  throw new Error("start-point draft validation anchor was not found");
}
output=output.replace(
  startPointRowsAnchor,
  "  if(!formula||!Number.isFinite(value)||value<=0||value>MAX_STOCK_LENGTH+1e-6) return [];"
);

const firstStraightViolationStart=output.indexOf("function firstStraightTechnologicalViolation(");
const firstStraightViolationEnd=firstStraightViolationStart>=0
  ? output.indexOf("\nfunction defaultRows()",firstStraightViolationStart)
  : -1;
if(firstStraightViolationStart<0||firstStraightViolationEnd<0){
  throw new Error("firstStraightTechnologicalViolation function was not found");
}
output=
  output.slice(0,firstStraightViolationStart)+
  "function firstStraightTechnologicalViolation(){ return null; }"+
  output.slice(firstStraightViolationEnd);

const validLineAnchor =
  "function validLineLength(v, rowIndex=-1){\n"+
  "  if (!(Number.isFinite(v) && v >= minStraight())) return false;";
if(!output.includes(validLineAnchor)){
  throw new Error("validLineLength Lmin anchor was not found");
}
output=output.replace(
  validLineAnchor,
  "function validLineLength(v, rowIndex=-1){\n"+
  "  if (!(Number.isFinite(v) && v > 0)) return false;\n"+
  "  const endpoint=rowIndex>=0&&isEndStraightRowIndex(state.rows||[],rowIndex);\n"+
  "  if(!endpoint&&v<minStraight())return false;"
);

const candidateLineAnchor =
  "  for(const row of rows){\n"+
  "    if(row?.type==='LINE'&&!(Number(row.L)>=minStraight()))return {allowed:false,reason:'line',message:`Прямой участок короче Lmin ${fmt(minStraight(),1)} мм`};";
if(!output.includes(candidateLineAnchor)){
  throw new Error("candidate row Lmin validation anchor was not found");
}
output=output.replace(
  candidateLineAnchor,
  "  for(let rowIndex=0;rowIndex<rows.length;rowIndex+=1){\n"+
  "    const row=rows[rowIndex];\n"+
  "    if(row?.type==='LINE'&&!isEndStraightRowIndex(rows,rowIndex)&&!(Number(row.L)>=minStraight()))return {allowed:false,reason:'line',message:`Внутренний прямой участок короче Lmin ${fmt(minStraight(),1)} мм`};"
);

const tubeValidationLminAnchor =
  "    else if(Number.isFinite(technologicalLmin)&&length+1e-6<technologicalLmin)issues.push('Прямой участок короче Lmin '+fmt(technologicalLmin,1)+' мм');";
if(output.includes(tubeValidationLminAnchor)){
  output=output.replace(
    tubeValidationLminAnchor,
    "    else if(!isEndStraightRowIndex(rows,index)&&Number.isFinite(technologicalLmin)&&length+1e-6<technologicalLmin)issues.push('Внутренний прямой участок короче Lmin '+fmt(technologicalLmin,1)+' мм');"
  );
}else if(!output.includes("Сегмент StraightRun ")){
  throw new Error("red row / StraightRun Lmin validation anchor was not found");
}

const checksLengthAnchor =
  "  const rows=state.rows||[],lengths=rows.filter(r=>r.type==='LINE').every(r=>num(r.L)>=minStraight()-1e-6),angles=rows.filter(r=>r.type==='BEND').every(r=>num(r.angle)!==0&&Math.abs(num(r.angle))<=180);";
if(!output.includes(checksLengthAnchor)){
  throw new Error("checks segment-length anchor was not found");
}
output=output.replace(
  checksLengthAnchor,
  "  const rows=state.rows||[],lengths=rows.every((r,index)=>r?.type!=='LINE'||isEndStraightRowIndex(rows,index)||num(r.L)>=minStraight()-1e-6),angles=rows.filter(r=>r.type==='BEND').every(r=>num(r.angle)!==0&&Math.abs(num(r.angle))<=180);"
);

const sketchLminAnchor =
  "    const lengths=SR.segments.map(s=>num(s.length)),lmin=Number(pipeDb[toolIndex].Lmin)||0;for(let i=0;i<lengths.length;i++){if(!Number.isFinite(lengths[i])||lengths[i]<=0){setStatus(`Введите линейный размер L${i+1}.`,'error');return;}if(lengths[i]+1e-6<lmin){setStatus(`L${i+1}=${lengths[i]} мм меньше технологического Lmin=${lmin} мм.`,'error');return;}}";
if(!output.includes(sketchLminAnchor)){
  throw new Error("sketch-recognition Lmin validation anchor was not found");
}
output=output.replace(
  sketchLminAnchor,
  "    const lengths=SR.segments.map(s=>num(s.length)),lmin=Number(pipeDb[toolIndex].Lmin)||0;for(let i=0;i<lengths.length;i++){if(!Number.isFinite(lengths[i])||lengths[i]<=0){setStatus(`Введите линейный размер L${i+1}.`,'error');return;}const endpoint=i===0||i===lengths.length-1;if(!endpoint&&lengths[i]+1e-6<lmin){setStatus(`Внутренний L${i+1}=${lengths[i]} мм меньше технологического Lmin=${lmin} мм.`,'error');return;}}"
);

const openInspectionLminAnchor =
  "    if(r.type==='LINE'&&poNumeric(r.L,NaN)<min)t._poIssues.push({level:'warn',text:`Участок ${ri+1} меньше Lmin ${min} мм`});";
if(!output.includes(openInspectionLminAnchor)){
  throw new Error("project-open Lmin warning anchor was not found");
}
output=output.replace(
  openInspectionLminAnchor,
  "    if(r.type==='LINE'&&!isEndStraightRowIndex(t.rows||[],ri)&&poNumeric(r.L,NaN)<min)t._poIssues.push({level:'warn',text:`Внутренний участок ${ri+1} меньше Lmin ${min} мм`});"
);

const autorouteShortsAnchor =
  "shorts=lengths.filter(x=>x<n(style.minStraight)).length";
if(!output.includes(autorouteShortsAnchor)){
  throw new Error("autoroute Lmin scoring anchor was not found");
}
output=output.replace(
  autorouteShortsAnchor,
  "shorts=lengths.filter((x,index)=>index>0&&index<lengths.length-1&&x<n(style.minStraight)).length"
);

const diagnoseLineAnchor =
  "const rows=tubeRows(t),lines=rows.filter(r=>r.type==='LINE'),bends=rows.filter(r=>r.type==='BEND');for(const r of lines){if(n(r.L)<n(style?.minStraight,0)){issues.push(`Прямой участок ${round(n(r.L),1)} мм меньше Lmin ${n(style?.minStraight)} мм`);conflict=true;}}for(const r of bends){";
if(!output.includes(diagnoseLineAnchor)){
  throw new Error("diagnoseTube line Lmin anchor was not found");
}
output=output.replace(
  diagnoseLineAnchor,
  "const rows=tubeRows(t),lines=rows.filter(r=>r.type==='LINE'),bends=rows.filter(r=>r.type==='BEND');for(let rowIndex=0;rowIndex<rows.length;rowIndex++){const r=rows[rowIndex];if(r?.type==='LINE'&&!isEndStraightRowIndex(rows,rowIndex)&&n(r.L)<n(style?.minStraight,0)){issues.push(`Внутренний прямой участок ${round(n(r.L),1)} мм меньше Lmin ${n(style?.minStraight)} мм`);conflict=true;}}for(const r of bends){"
);

const manufacturingRowsAnchor =
  "rows=tubeRows(t),steps=[];let lineNo=0,bendNo=0,feed=0,lastRotation=0;";
if(!output.includes(manufacturingRowsAnchor)){
  throw new Error("manufacturingData rows anchor was not found");
}
output=output.replace(
  manufacturingRowsAnchor,
  "rows=tubeRows(t),steps=[],endAllowances=technologicalEndAllowancePlan(t,{minimumStraight:n(style?.minStraight,0),clampMin:n(machine?.clampMin,0),minFeed:n(machine?.minFeed,0)});let lineNo=0,bendNo=0,feed=0,lastRotation=0;"
);

const manufacturingStepAnchor =
  "Y:round(feed,3),B:round(rotation-lastRotation,3),C:round(angle,3),L:round(feed,3),R:";
if(!output.includes(manufacturingStepAnchor)){
  throw new Error("manufacturing first-feed anchor was not found");
}
output=output.replace(
  manufacturingStepAnchor,
  "Y:round(feed+(bendNo===1?endAllowances.startAllowance:0),3),B:round(rotation-lastRotation,3),C:round(angle,3),L:round(feed+(bendNo===1?endAllowances.startAllowance:0),3),R:"
);

const manufacturingProductionAnchor =
  "production=theoretical+elong+n(style.cutAllowanceStart)+n(style.cutAllowanceEnd),od=";
if(!output.includes(manufacturingProductionAnchor)){
  throw new Error("manufacturing production length anchor was not found");
}
output=output.replace(
  manufacturingProductionAnchor,
  "production=theoretical+elong+n(style.cutAllowanceStart)+n(style.cutAllowanceEnd)+endAllowances.totalAllowance,od="
);

const manufacturingReturnAnchor =
  "return {steps,theoretical,elongation:elong,production,massKg,areaMm2,style,machine,xyz};}";
if(!output.includes(manufacturingReturnAnchor)){
  throw new Error("manufacturingData return anchor was not found");
}
output=output.replace(
  manufacturingReturnAnchor,
  "return {steps,theoretical,elongation:elong,production,massKg,areaMm2,style,machine,xyz,endAllowances};}"
);

const sequenceTailAnchor =
  "const rows=tubeRows(t),first=rows.find(r=>r.type==='LINE'),last=[...rows].reverse().find(r=>r.type==='LINE');if(n(first?.L)<n(d.machine.clampMin))issues.push(`Начальный хвост меньше зоны зажима ${d.machine.clampMin} мм`);if(n(last?.L)<n(d.machine.clampMin))issues.push(`Конечный хвост меньше зоны зажима ${d.machine.clampMin} мм`);";
if(!output.includes(sequenceTailAnchor)){
  throw new Error("machine sequence tail anchor was not found");
}
output=output.replace(
  sequenceTailAnchor,
  "const rows=tubeRows(t),first=rows.find(r=>r.type==='LINE'),last=[...rows].reverse().find(r=>r.type==='LINE'),allow=d.endAllowances||technologicalEndAllowancePlan(t,{minimumStraight:n(d.style?.minStraight,0),clampMin:n(d.machine?.clampMin,0),minFeed:n(d.machine?.minFeed,0)});if(n(allow.effectiveStart)<n(d.machine.clampMin))issues.push(`Начальная технологическая длина меньше зоны зажима ${d.machine.clampMin} мм`);if(n(allow.effectiveEnd)<n(d.machine.clampMin))issues.push(`Конечная технологическая длина меньше зоны зажима ${d.machine.clampMin} мм`);"
);

const diagnosticStockAnchor =
  "const dev=developedLengthWithRowsAndPipe(rows,t.diameterIndex);if(dev>n(machine?.maxStockLength,MAX_STOCK_LENGTH)){issues.push(`Заготовка ${round(dev,1)} мм длиннее лимита станка ${n(machine?.maxStockLength)} мм`);conflict=true;}";
if(!output.includes(diagnosticStockAnchor)){
  throw new Error("diagnoseTube stock-length anchor was not found");
}
output=output.replace(
  diagnosticStockAnchor,
  "const dev=manufacturingData(t).production;if(dev>n(machine?.maxStockLength,MAX_STOCK_LENGTH)){issues.push(`Производственная заготовка ${round(dev,1)} мм длиннее лимита станка ${n(machine?.maxStockLength)} мм`);conflict=true;}"
);

const renderAllowanceAnchor =
  "  drawTable();E('engManufacturingFormat').addEventListener('change',()=>{activeEng().manufacturing.preferredFormat=E('engManufacturingFormat').value;save();drawTable();});";
if(!output.includes(renderAllowanceAnchor)){
  throw new Error("manufacturing-card allowance insertion anchor was not found");
}
output=output.replace(
  renderAllowanceAnchor,
  "  drawTable();\n"+
  "  const allowance=d.endAllowances||{};\n"+
  "  const allowanceBox=document.createElement('div');\n"+
  "  allowanceBox.id='engTechnologicalAllowance';\n"+
  "  allowanceBox.className='eng-note'+(allowance.totalAllowance>1e-6?' warn':'');\n"+
  "  allowanceBox.style.marginTop='8px';\n"+
  "  allowanceBox.innerHTML=allowance.totalAllowance>1e-6\n"+
  "    ?'<b>Технологический припуск (удалить после гибки)</b><br>Начало: <b>+'+round(allowance.startAllowance,2)+' мм</b> → рабочая длина '+round(allowance.effectiveStart,2)+' мм; конец: <b>+'+round(allowance.endAllowance,2)+' мм</b> → рабочая длина '+round(allowance.effectiveEnd,2)+' мм. Первый Y/L в карте уже включает начальный припуск. Номинальные размеры готовой детали не изменены.'\n"+
  "    :'<b>Технологический припуск:</b> не требуется — начальный и конечный участки обеспечивают требуемую технологическую длину.';\n"+
  "  E('engManufacturingTable')?.insertAdjacentElement('afterend',allowanceBox);\n"+
  "  E('engManufacturingFormat').addEventListener('change',()=>{activeEng().manufacturing.preferredFormat=E('engManufacturingFormat').value;save();drawTable();});"
);

const reportAllowanceAnchor =
  "<div><b>Производственная длина:</b> ${round(d.production,2)} мм</div><div><b>Расчётная масса:</b>";
if(!output.includes(reportAllowanceAnchor)){
  throw new Error("print-report allowance summary anchor was not found");
}
output=output.replace(
  reportAllowanceAnchor,
  "<div><b>Производственная длина:</b> ${round(d.production,2)} мм</div><div><b>Технологический припуск:</b> начало +${round(d.endAllowances?.startAllowance||0,2)} мм; конец +${round(d.endAllowances?.endAllowance||0,2)} мм (удалить после гибки)</div><div><b>Расчётная масса:</b>"
);

const reportTableAnchor =
  "</tbody></table><h2>Диагностика</h2>";
if(!output.includes(reportTableAnchor)){
  throw new Error("print-report allowance note anchor was not found");
}
output=output.replace(
  reportTableAnchor,
  "</tbody></table><div style=\"margin:10px 0;padding:8px;border:1px solid #cc9;background:#fff8dd\"><b>Припуски карты гибки:</b> начальный +${round(d.endAllowances?.startAllowance||0,2)} мм; конечный +${round(d.endAllowances?.endAllowance||0,2)} мм. Припуски технологические и удаляются после гибки; геометрия готовой детали остаётся номинальной.</div><h2>Диагностика</h2>"
);

const materialManufacturingDataStartAnchor =
  "function manufacturingData(t=activeTube()){if(!t)return {steps:[]};const p=activeProject(),e=t.engineering,style=p.engineering.styles.find(x=>x.id===e.styleId)||p.engineering.styles[0],machine=p.engineering.machines.find(x=>x.id===e.machineId)||p.engineering.machines[0],rows=tubeRows(t),steps=[],endAllowances=technologicalEndAllowancePlan(t,{minimumStraight:n(style?.minStraight,0),clampMin:n(machine?.clampMin,0),minFeed:n(machine?.minFeed,0)});let lineNo=0,bendNo=0,feed=0,lastRotation=0;";
if(!output.includes(materialManufacturingDataStartAnchor)){throw new Error("material-aware manufacturingData start anchor was not found");}
output=output.replace(materialManufacturingDataStartAnchor,
  "function manufacturingData(t=activeTube()){if(!t)return {steps:[]};const p=projectForTube(t)||activeProject(),e=t.engineering,style=p.engineering.styles.find(x=>x.id===e.styleId)||p.engineering.styles[0],rows=tubeRows(t),equipmentTubeFacts={...t,od_mm:n(style?.outerDiameter,NaN),wall_mm:n(style?.wallThickness,NaN),bend_clr_mm:(rows||[]).filter(row=>row?.type==='BEND').map(row=>Number(row?.clr)).filter(Number.isFinite)},legacyMachine=p.engineering.machines.find(x=>x.id===e.machineId)||p.engineering.machines[0],equipmentBridge=window.TubeBenderEquipmentRuntime||null,machine=equipmentBridge?.effectiveMachine?.(p,t,legacyMachine)||legacyMachine,equipmentAssignment=equipmentBridge?.assignmentCheck?.(p,equipmentTubeFacts)||{ok:true,status:'Valid',errors:[],warnings:[]},machineSetup=equipmentBridge?.activeMachineSetup?.(t)||null,setupValidation=equipmentBridge?.machineSetupCheck?.(p,t)||{ok:true,status:'NotConfigured',errors:[],warnings:[]},equipmentValidation={ok:equipmentAssignment.ok!==false&&setupValidation.ok!==false,status:(equipmentAssignment.ok===false||setupValidation.ok===false)?'Error':((equipmentAssignment.status==='Warning'||setupValidation.status==='Warning')?'Warning':'Valid'),errors:[...(equipmentAssignment.errors||[]),...(setupValidation.errors||[])],warnings:[...(equipmentAssignment.warnings||[]),...(setupValidation.warnings||[])]},setupOffsetMm=equipmentBridge?.machineSetupOffsetMm?.(t)||0,setupExtensions=equipmentBridge?.machineSetupExtensions?.(t)||{start_mm:0,end_mm:0},materialBridge=window.TubeBenderMaterialManufacturing||null,materialProfile=materialBridge?.resolveProfile?.(p,t)||null,materialValidation=materialBridge?.materialCheck?.(p,equipmentTubeFacts,{requireSpringback:true,requireDensity:false,requireWarningAck:true})||{ok:false,status:'Error',errors:['Material manufacturing bridge unavailable'],warnings:[]},toolingCorrectionDeg=equipmentBridge?.toolingCorrectionDeg?.(p,t)||0,steps=[],endAllowances=technologicalEndAllowancePlan(t,{minimumStraight:n(style?.minStraight,0),clampMin:n(machine?.clampMin,0),minFeed:n(machine?.minFeed,0)});let lineNo=0,bendNo=0,feed=0,lastRotation=0;");

const materialCommandAngleAnchor =
  "bendNo++;const rotation=round(getBendRotationValue(r),3),angle=n(r.angle),commandAngle=round(angle+Math.sign(angle||1)*n(style.springbackDeg),3);steps.push({";
if(!output.includes(materialCommandAngleAnchor)){throw new Error("legacy style springback command anchor was not found");}
output=output.replace(materialCommandAngleAnchor,
  "bendNo++;const rotation=round(getBendRotationValue(r),3),angle=n(r.angle),materialCompensation=materialBridge?.compensateBend?.({project:p,tube:equipmentTubeFacts,nominalAngleDeg:angle,toolingCorrectionDeg})||{ok:false,commandAngleDeg:null,errors:['Material compensation unavailable'],warnings:[]},commandAngle=materialCompensation.ok?round(materialCompensation.commandAngleDeg,3):null;steps.push({");

const materialStepAnchor = "commandAngle,plane:r.plane||'',radius:";
if(!output.includes(materialStepAnchor)){throw new Error("manufacturing step command-angle anchor was not found");}
output=output.replace(materialStepAnchor,"commandAngle,materialCompensation,plane:r.plane||'',radius:");

const materialMassAnchor = "massKg=areaMm2*production*1e-9*n(style.densityKgM3,7850);";
if(!output.includes(materialMassAnchor)){throw new Error("legacy style density mass anchor was not found");}
output=output.replace(materialMassAnchor,"materialDensityKgM3=materialBridge?.densityKgM3?.(p,t)??null,massKg=Number.isFinite(materialDensityKgM3)?areaMm2*production*1e-9*materialDensityKgM3:null,trimBridge=window.TubeBenderTrimCutRuntime||null,trimPlan=trimBridge?.buildPlan?.({tube:t,endAllowances,setupExtensions,style})||{operations:[],required_removal_mm:0,nominal_geometry_changed:false},trimValidation=trimBridge?.validate?.(trimPlan)||{ok:true,status:'NotChecked',errors:[],warnings:[]},finishedLengthAfterTrim=trimBridge?.finishedLength?.(production,trimPlan)??null;");

const materialReturnAnchor = "return {steps,theoretical,elongation:elong,production,massKg,areaMm2,style,machine,xyz,endAllowances};}";
if(!output.includes(materialReturnAnchor)){throw new Error("material manufacturingData return anchor was not found");}
output=output.replace(materialReturnAnchor,"return {steps,theoretical,elongation:elong,production,massKg,areaMm2,style,machine,legacyMachine,xyz,endAllowances,materialProfile,materialValidation,materialDensityKgM3,equipmentValidation,toolingCorrectionDeg,machineSetup,setupValidation,setupOffsetMm,setupExtensions,trimPlan,trimValidation,finishedLengthAfterTrim};}");

const machineSetupFeedAnchor =
  "Y:round(feed+(bendNo===1?endAllowances.startAllowance:0),3),B:round(rotation-lastRotation,3),C:round(angle,3),L:round(feed+(bendNo===1?endAllowances.startAllowance:0),3),R:";
if(!output.includes(machineSetupFeedAnchor)){throw new Error("Machine Setup feed anchor was not found");}
output=output.replace(machineSetupFeedAnchor,
  "Y:round(feed+(bendNo===1?endAllowances.startAllowance+setupExtensions.start_mm+setupOffsetMm:0),3),B:round(rotation-lastRotation,3),C:round(angle,3),L:round(feed+(bendNo===1?endAllowances.startAllowance+setupExtensions.start_mm+setupOffsetMm:0),3),R:");

const machineSetupProductionAnchor =
  "production=theoretical+elong+n(style.cutAllowanceStart)+n(style.cutAllowanceEnd)+endAllowances.totalAllowance,od=";
if(!output.includes(machineSetupProductionAnchor)){throw new Error("Machine Setup production-length anchor was not found");}
output=output.replace(machineSetupProductionAnchor,
  "production=theoretical+elong+n(style.cutAllowanceStart)+n(style.cutAllowanceEnd)+endAllowances.totalAllowance+setupExtensions.start_mm+setupExtensions.end_mm,od=");

const materialReleaseStyleAnchor =
  "  if(!style)blockers.push('Не выбран технологический стиль');else{\n    if(style.confirmed!==true)blockers.push('Технологический стиль не подтверждён пользователем');\n    if(!String(style.material||'').trim())blockers.push('Не указан материал');\n    if(!(Number(style.wallThickness)>0))blockers.push('Не подтверждена толщина стенки');\n    if(!(Number(style.densityKgM3)>0))blockers.push('Не подтверждена плотность материала');\n    for(const field of ['springbackDeg','elongationPerDegree','cutAllowanceStart','cutAllowanceEnd'])if(style[field]===null||style[field]===undefined||style[field]==='')blockers.push(`Не подтверждён параметр ${field}`);\n  }";
if(!output.includes(materialReleaseStyleAnchor)){throw new Error("legacy release material/style anchor was not found");}
output=output.replace(materialReleaseStyleAnchor,
  "  if(!style)blockers.push('Не выбран технологический стиль');else{\n    if(style.confirmed!==true)blockers.push('Технологический стиль не подтверждён пользователем');\n    if(!(Number(style.wallThickness)>0))blockers.push('Не подтверждена толщина стенки');\n    for(const field of ['elongationPerDegree','cutAllowanceStart','cutAllowanceEnd'])if(style[field]===null||style[field]===undefined||style[field]==='')blockers.push(`Не подтверждён параметр ${field}`);\n  }\n  const materialGate=manufacturingData(t).materialValidation;\n  if(!materialGate?.ok){for(const issue of materialGate?.errors||['Material Profile не готов к технологическому расчёту'])blockers.push(`Материал: ${issue}`);}\n  const equipmentGate=window.TubeBenderEquipmentRuntime?.assignmentCheck?.(p,t);\n  if(equipmentGate&&!equipmentGate.ok){for(const issue of equipmentGate.errors||[])blockers.push(`Оборудование: ${issue}`);}\n  const setupGate=window.TubeBenderEquipmentRuntime?.machineSetupCheck?.(p,t);\n  if(setupGate&&!setupGate.ok){for(const issue of setupGate.errors||[])blockers.push(`Machine Setup: ${issue}`);}\n  if(t.sequence_analysis_preference?.kinematic_rebuild_required===true)blockers.push('Выбранная последовательность гибов требует проверенного kinematic rebuild Y/B/C перед экспортом');\n  const simulationCollisionGate=window.TubeBenderEquipmentLibrary?.simulationCollisionReport?.(t,manufacturingData(t));\n  if(simulationCollisionGate?.decision?.release_blocked===true)blockers.push('Bending Simulation: '+(simulationCollisionGate.decision.reason||simulationCollisionGate.report?.status||'collision validation failed'));\n  if(String(p?.clearance_edit_mode||'Monitor')==='ValidationLock'){const clearanceGate=window.TubeBenderEquipmentLibrary?.clearanceSummary?.();if(clearanceGate?.red_count>0)blockers.push('Clearance Monitor: есть Red нарушения минимального зазора');if(clearanceGate?.not_checked_count>0)blockers.push('Clearance Monitor: не все активные проверки рассчитаны');}");

const genericNcAnchor =
  "function genericNc(t=activeTube(),format='YBC'){const d=manufacturingData(t),lines=[`; TubeBender CAD ${window.TubeBenderBuildInfo?.appVersion||'VC207R7'}`,`; Tube=${t.name}`,`; Style=${d.style.name}`,`; Machine=${d.machine.name}`,`; Stock=${round(d.production,3)} mm`];for(const s of d.steps){if(format==='LRA')lines.push(`L${s.L.toFixed(3)} R${s.R.toFixed(3)} A${s.commandAngle.toFixed(3)}`);else lines.push(`Y${s.Y.toFixed(3)} B${s.B.toFixed(3)} C${s.commandAngle.toFixed(3)}`);}return lines.join('\\n');}";
if(!output.includes(genericNcAnchor)){throw new Error("generic NC generator anchor was not found");}
output=output.replace(genericNcAnchor,
  "function genericNc(t=activeTube(),format='YBC'){const d=manufacturingData(t);if(d.steps.some(s=>!Number.isFinite(Number(s.commandAngle))))throw new Error('NC export: material springback compensation is unresolved');const lines=[`; TubeBender CAD ${window.TubeBenderBuildInfo?.appVersion||'VC207R7'}`,`; Tube=${t.name}`,`; Material=${d.materialProfile?.name||'UNRESOLVED'}`,`; Style=${d.style.name}`,`; Machine=${d.machine.name}`,`; Setup=${d.machineSetup?.name||'NONE'}`,`; Stock=${round(d.production,3)} mm`];for(const s of d.steps){if(format==='LRA')lines.push(`L${s.L.toFixed(3)} R${s.R.toFixed(3)} A${s.commandAngle.toFixed(3)}`);else lines.push(`Y${s.Y.toFixed(3)} B${s.B.toFixed(3)} C${s.commandAngle.toFixed(3)}`);}return lines.join('\\n');}");

const genericPostAnchor =
  "window.TB_NC_POSTPROCESSORS=window.TB_NC_POSTPROCESSORS||{};window.TB_NC_POSTPROCESSORS['generic-ybc']={name:'Generic YBC',generate:t=>genericNc(t,'YBC')};window.TB_NC_POSTPROCESSORS['generic-lra']={name:'Generic LRA',generate:t=>genericNc(t,'LRA')};";
if(!output.includes(genericPostAnchor)){throw new Error("generic postprocessor registration anchor was not found");}
output=output.replace(genericPostAnchor,
  "window.TB_NC_POSTPROCESSORS=window.TB_NC_POSTPROCESSORS||{};window.TB_NC_POSTPROCESSORS['generic-ybc']={name:'Generic YBC',format:'YBC',parser:true,generate:t=>genericNc(t,'YBC')};window.TB_NC_POSTPROCESSORS['generic-lra']={name:'Generic LRA',format:'LRA',parser:true,generate:t=>genericNc(t,'LRA')};");

const ncExportAnchor =
  "  else if(kind==='nc'){const post=window.TB_NC_POSTPROCESSORS[d.machine.ncPost];if(!post){ptToast('NC-постпроцессор недоступен');return false;}downloadText(base+'.nc',post.generate(t),'text/plain');}";
if(!output.includes(ncExportAnchor)){throw new Error("NC export anchor was not found");}
output=output.replace(ncExportAnchor,
  "  else if(kind==='nc'){const post=window.TB_NC_POSTPROCESSORS[d.machine.ncPost];if(!post){ptToast('NC-постпроцессор недоступен');return false;}if(window.TubeBenderEquipmentRuntime?.confirmTechnologyCalculation?.(t)!==true){ptToast('NC-экспорт отменён: Fitted-геометрия не подтверждена');return false;}const validation=window.TubeBenderMaterialManufacturing?.validateManufacturingData?.({project:activeProject(),tube:t,manufacturing:d,kind:'nc'});if(validation&&!validation.ok){ptToast('NC-экспорт заблокирован: '+validation.errors[0]);console.warn('Postprocessor validation failed',validation);return false;}if(validation?.status==='Warning'&&validation.warnings?.length){const accepted=window.confirm('NC-экспорт содержит предупреждения:\n\n'+validation.warnings.join('\n')+'\n\nПродолжить экспорт?');if(!accepted){ptToast('NC-экспорт отменён пользователем');return false;}}let ncText;try{ncText=post.generate(t);}catch(error){ptToast('NC-экспорт заблокирован: '+(error?.message||error));return false;}if(post.parser===true){const roundTrip=window.TubeBenderMaterialManufacturing?.roundTripValidate?.({text:ncText,format:post.format,expectedSteps:d.steps});if(roundTrip&&!roundTrip.ok){ptToast('NC round-trip проверка не пройдена');console.warn('NC round-trip failed',roundTrip);return false;}}downloadText(base+'.nc',ncText,'text/plain');}");


const simulationCollisionLiveAnchor = "function simAddCollisionMarkers";
if(!output.includes(simulationCollisionLiveAnchor)){
  throw new Error("simAddCollisionMarkers anchor was not found for live collision capture");
}
const simulationCollisionLiveHook =
  "const tbSimulationCollisionLiveStore=new Map();\n"+
  "function tbSimulationCollisionLiveBucket(tubeId){const key=String(tubeId??'');if(!key)return null;if(!tbSimulationCollisionLiveStore.has(key))tbSimulationCollisionLiveStore.set(key,new Map());return tbSimulationCollisionLiveStore.get(key);}\n"+
  "function tbSimulationCollisionKind(item){const text=String(item?.type??item?.kind??'').toLowerCase();if(text==='tube'||text.includes('self'))return 'self';if(text.includes('tool')||text.includes('die')||text.includes('clamp')||text.includes('mandrel')||text.includes('wiper'))return 'tooling';if(text.includes('fixture'))return 'fixture';return 'machine';}\n"+
  "function tbSimulationCollisionBendKey(phase){return String(phase?.step?.elementId??phase?.step?.bend_id??phase?.step?.bend??phase?.bend??'');}\n"+
  "function tbSimulationCollisionCapture(result){try{const t=typeof activeTube==='function'?activeTube():null,phase=typeof simCurrentPhase==='function'?simCurrentPhase():null,bendId=tbSimulationCollisionBendKey(phase);if(!t||!bendId)return;const bucket=tbSimulationCollisionLiveBucket(t.id);if(!bucket)return;const raw=Array.isArray(result)?result:(Array.isArray(result?.collisions)?result.collisions:[]),previous=bucket.get(bendId)||[];if(!raw.length){if(!previous.some(x=>x.collision===true||x.impossible===true))bucket.set(bendId,[{bend_id:bendId,kind:'machine',checked:true,collision:false,impossible:false,clearance_mm:null,message:null,source:'simCollisionChecks'}]);return;}const next=[...previous];for(const item of raw){const kind=tbSimulationCollisionKind(item),clearanceRaw=item?.clearance_mm??item?.clearance??item?.distance_mm??item?.distance,clearance=Number.isFinite(Number(clearanceRaw))?Number(clearanceRaw):null,message=String(item?.message??item?.label??item?.type??'Collision');const found=next.find(x=>x.kind===kind&&x.collision===true);if(found){if(clearance!==null&&(found.clearance_mm===null||clearance<found.clearance_mm))found.clearance_mm=clearance;if(message&&!found.message)found.message=message;}else next.push({bend_id:bendId,kind,checked:true,collision:true,impossible:item?.impossible===true,contact:item?.contact===true,clearance_mm:clearance,message,source:'simCollisionChecks'});}bucket.set(bendId,next);const mode=String(t?.simulation_collision_settings?.mode||'Monitor');if(mode==='Stop'||mode==='ValidationLock'){const sim=typeof simEnsureState==='function'?simEnsureState():null;if(sim){sim.running=false;sim.collisionStopped=true;sim.collisionStoppedAtBend=bendId;sim.collisionStopReason='Collision detected at bend '+bendId;}try{if(typeof simUpdateUi==='function')simUpdateUi();}catch{}}}catch(error){console.warn('Simulation collision capture failed',error);}}\n"+
  "window.TubeBenderSimulationCollisionLive=Object.freeze({observationsForTube:(tubeId)=>{const bucket=tbSimulationCollisionLiveStore.get(String(tubeId??''));return bucket?[...bucket.values()].flat().map(x=>({...x})):[];},clearTube:(tubeId)=>tbSimulationCollisionLiveStore.delete(String(tubeId??'')),clearAll:()=>tbSimulationCollisionLiveStore.clear()});\n"+
  "const tbOriginalSimCollisionChecks=simCollisionChecks;\n"+
  "simCollisionChecks=function(...args){const result=tbOriginalSimCollisionChecks.apply(this,args);tbSimulationCollisionCapture(result);return result;};\n"+
  "function simAddCollisionMarkers";
output=output.replace(simulationCollisionLiveAnchor,simulationCollisionLiveHook);

const simulationMaterialAnchor =
  "function simBuildTimeline(t=activeTube()){\n  const s=simEnsureState(),d=manufacturingData(t),rows=tubeRows(t),timeline=[],technology=simTechnologyForTube(t,d);\n  s.technology=technology.kind;s.technologySource=technology.source;s.technologyConfirmed=technology.confirmed;";
if(!output.includes(simulationMaterialAnchor)){throw new Error("simulation material gate anchor was not found");}
output=output.replace(simulationMaterialAnchor,
  "function simBuildTimeline(t=activeTube()){\n  const s=simEnsureState(),d=manufacturingData(t),rows=tubeRows(t),timeline=[],technology=simTechnologyForTube(t,d),materialSimulationGate=window.TubeBenderMaterialManufacturing?.validateManufacturingData?.({project:projectForTube(t)||activeProject(),tube:t,manufacturing:d,kind:'simulation'});\n  window.TubeBenderSimulationCollisionLive?.clearTube?.(t?.id);\n  const simulationCollision=window.TubeBenderEquipmentLibrary?.simulationCollisionReport?.(t,d);\n  s.technology=technology.kind;s.technologySource=technology.source;s.technologyConfirmed=technology.confirmed;s.collisionReport=simulationCollision?.report||null;s.collisionDecision=simulationCollision?.decision||null;\n  if(materialSimulationGate&&!materialSimulationGate.ok){timeline.push({type:'blocked',duration:1,title:'Материал: '+materialSimulationGate.errors[0],bend:0,rowIndex:-1,bendRowIndex:-1,step:null});s.steps=d.steps;s.timeline=timeline;s.phaseIndex=0;s.phaseProgress=0;s.index=0;return timeline;}\n  if(simulationCollision?.decision?.can_continue===false){timeline.push({type:'blocked',duration:1,title:'Collision: '+(simulationCollision.decision.reason||simulationCollision.report?.status||'blocked'),bend:0,rowIndex:-1,bendRowIndex:-1,step:null,collisionReport:simulationCollision.report});s.steps=d.steps;s.timeline=timeline;s.phaseIndex=0;s.phaseProgress=0;s.index=0;return timeline;}");

const materialReportAnchor = "<div><b>Материал:</b> ${esc(d.style.material)}</div>";
if(!output.includes(materialReportAnchor)){throw new Error("report material anchor was not found");}
output=output.replace(materialReportAnchor,"<div><b>Material Profile:</b> ${esc(d.materialProfile?.name||'НЕ НАЗНАЧЕН')}</div><div><b>Machine Setup:</b> ${esc(d.machineSetup?.name||'НЕ НАЗНАЧЕН')}</div>");

const materialManufacturingNoteAnchor = "<div class=\"eng-note\">Технология: ${esc(technology.label)}${technology.source==='diameter_default'?' · требуется подтверждение профиля':''}</div>";
if(!output.includes(materialManufacturingNoteAnchor)){throw new Error("manufacturing technology note anchor was not found");}
output=output.replace(materialManufacturingNoteAnchor,"<div class=\"eng-note\">Технология: ${esc(technology.label)}${technology.source==='diameter_default'?' · требуется подтверждение профиля':''}<br>Материал: ${esc(d.materialProfile?.name||'не назначен')} · springback factor: ${d.materialProfile?.springback??'—'}${d.materialValidation?.ok?'':' · технологический расчёт заблокирован'}</div>");

const materialMassKpiAnchor = "${kpi('Масса',`${round(d.massKg,3)} кг`)}";
if(!output.includes(materialMassKpiAnchor)){throw new Error("manufacturing mass KPI anchor was not found");}
output=output.replace(materialMassKpiAnchor,"${kpi('Масса',d.massKg==null?'—':`${round(d.massKg,3)} кг`)}");

const materialCommandCellAnchor = "<td>${x.commandAngle}°</td>";
if(!output.includes(materialCommandCellAnchor)){throw new Error("manufacturing command display anchor was not found");}
output=output.replaceAll(materialCommandCellAnchor,"<td>${x.commandAngle==null?'—':x.commandAngle+'°'}</td>");

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
  normalizeImportedProjectBendRadiiToTechnology:async(...args)=>(await loadDwfxModule()).normalizeImportedProjectBendRadiiToTechnology(...args),
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

const objectSelectionContextUi = fs.readFileSync(objectSelectionContextUiPath, "utf8").replace(/<\/script/gi, "<\\/script");
const bundledObjectSelectionContextUi =
  `<script data-tubebender-bundled="object-selection-context-ui">\n${objectSelectionContextUi}\n</script>`;

const repeatCommandDomainUrl = moduleDataUrl(repeatCommandDomainPath);
const repeatCommandRuntime = fs.readFileSync(repeatCommandRuntimePath, "utf8")
  .replace("__TB_REPEAT_COMMAND_MODULE_URL__", repeatCommandDomainUrl)
  .replace(/<\/script/gi, "<\\/script");
const bundledRepeatCommandRuntime =
  `<script data-tubebender-bundled="repeat-command-runtime">\n${repeatCommandRuntime}\n</script>`;

const hotkeysDomainUrl = moduleDataUrl(hotkeysDomainPath);
const hotkeysRuntime = fs.readFileSync(hotkeysRuntimePath, "utf8")
  .replace("__TB_HOTKEYS_MODULE_URL__", hotkeysDomainUrl)
  .replace(/<\/script/gi, "<\\/script");
const bundledHotkeysRuntime =
  `<script data-tubebender-bundled="hotkeys-runtime">\n${hotkeysRuntime}\n</script>`;

const commandPaletteDomainUrl = moduleDataUrl(commandPaletteDomainPath);
const commandPaletteRuntime = fs.readFileSync(commandPaletteRuntimePath, "utf8")
  .replace("__TB_COMMAND_PALETTE_MODULE_URL__", commandPaletteDomainUrl)
  .replace(/<\/script/gi, "<\\/script");
const bundledCommandPaletteRuntime =
  `<script data-tubebender-bundled="command-palette-runtime">\n${commandPaletteRuntime}\n</script>`;

const selectionSetsDomainUrl = moduleDataUrl(selectionSetsDomainPath);
const selectionSetsRuntime = fs.readFileSync(selectionSetsRuntimePath, "utf8")
  .replace("__TB_SELECTION_SETS_MODULE_URL__", selectionSetsDomainUrl)
  .replace(/<\/script/gi, "<\\/script");
const bundledSelectionSetsRuntime =
  `<script data-tubebender-bundled="selection-sets-runtime">\n${selectionSetsRuntime}\n</script>`;

const namedViewsDomainUrl = moduleDataUrl(namedViewsDomainPath);
const namedViewsRuntime = fs.readFileSync(namedViewsRuntimePath, "utf8")
  .replace("__TB_NAMED_VIEWS_MODULE_URL__", namedViewsDomainUrl)
  .replace(/<\/script/gi, "<\\/script");
const bundledNamedViewsRuntime =
  `<script data-tubebender-bundled="named-views-runtime">\n${namedViewsRuntime}\n</script>`;

const sectionViewDomainUrl = moduleDataUrl(sectionViewDomainPath);
const sectionViewRuntime = fs.readFileSync(sectionViewRuntimePath, "utf8")
  .replace("__TB_SECTION_VIEW_MODULE_URL__", sectionViewDomainUrl)
  .replace("__TB_SECTION_DERIVED_MODULE_URL__", moduleDataUrl(sectionDerivedDomainPath))
  .replace(/<\/script/gi, "<\\/script");
const bundledSectionViewRuntime =
  `<script data-tubebender-bundled="section-view-runtime">\n${sectionViewRuntime}\n</script>`;

const projectTubeBarLayoutFix = fs.readFileSync(projectTubeBarLayoutFixPath, "utf8").replace(/<\/script/gi, "<\\/script");
const bundledProjectTubeBarLayoutFix =
  `<script data-tubebender-bundled="project-tube-bar-layout-fix">\n${projectTubeBarLayoutFix}\n</script>`;

const materialDomainUrl = moduleDataUrl(materialDomainPath);
const materialLibraryUi = fs.readFileSync(materialLibraryUiPath, "utf8")
  .replace("__TB_MATERIAL_MODULE_URL__", materialDomainUrl)
  .replace(/<\/script/gi, "<\\/script");
const bundledMaterialLibraryUi =
  `<script data-tubebender-bundled="material-library-ui">\n${materialLibraryUi}\n</script>`;

const materialManufacturingBridge = fs.readFileSync(materialManufacturingBridgePath, "utf8").replace(/<\/script/gi, "<\\/script");
const bundledMaterialManufacturingBridge =
  `<script data-tubebender-bundled="material-manufacturing-bridge">\n${materialManufacturingBridge}\n</script>`;

const geometryMeasurementsDomainUrl = moduleDataUrl(geometryMeasurementsDomainPath);
const dimensionsDomainUrl = moduleDataUrl(dimensionsDomainPath);
const reviewProgressDomainUrl = moduleDataUrl(reviewProgressDomainPath);
const auditDownloadDomainUrl = moduleDataUrl(auditDownloadDomainPath);
const measurementsUi = fs.readFileSync(measurementsUiPath, "utf8")
  .replace("__TB_GEOMETRY_MEASUREMENTS_MODULE_URL__", geometryMeasurementsDomainUrl)
  .replace("__TB_DIMENSIONS_MODULE_URL__", dimensionsDomainUrl)
  .replace("__TB_REVIEW_PROGRESS_MODULE_URL__", reviewProgressDomainUrl)
  .replace("__TB_AUDIT_DOWNLOAD_MODULE_URL__", auditDownloadDomainUrl)
  .replace(/<\/script/gi, "<\\/script");
const bundledMeasurementsUi =
  `<script data-tubebender-bundled="measurements-ui">\n${measurementsUi}\n</script>`;

const dimensionGripsRuntime = fs.readFileSync(dimensionGripsRuntimePath, "utf8")
  .replace("__TB_DIMENSION_GRIPS_DIMENSIONS_URL__", dimensionsDomainUrl)
  .replace("__TB_DIMENSION_GRIPS_DYNAMIC_INPUT_URL__", moduleDataUrl(dynamicInputDomainPath))
  .replace(/<\/script/gi, "<\\/script");
const bundledDimensionGripsRuntime =
  `<script data-tubebender-bundled="dimension-grips-runtime">\n${dimensionGripsRuntime}\n</script>`;

const screenSpaceDisplayRuntime = fs.readFileSync(screenSpaceDisplayRuntimePath, "utf8")
  .replace(/<\/script/gi, "<\\/script");
const bundledScreenSpaceDisplayRuntime =
  `<script data-tubebender-bundled="screen-space-display-runtime">\n${screenSpaceDisplayRuntime}\n</script>`;

const interactionPriorityRuntime = fs.readFileSync(interactionPriorityRuntimePath, "utf8")
  .replace(/<\/script/gi, "<\\/script");
const bundledInteractionPriorityRuntime =
  `<script data-tubebender-bundled="interaction-priority-runtime">\n${interactionPriorityRuntime}\n</script>`;

const straightRunDomainUrl = moduleDataUrl(straightRunDomainPath);
const legacyRigidTransformDomainUrl = moduleDataUrl(legacyRigidTransformDomainPath);
const dynamicInputDomainUrl = moduleDataUrl(dynamicInputDomainPath);
const transformCommandsDomainUrl = moduleDataUrl(transformCommandsDomainPath);
const copyDependenciesDomainUrl = moduleDataUrl(copyDependenciesDomainPath);
const editingUi = fs.readFileSync(editingUiPath, "utf8")
  .replace("__TB_STRAIGHT_RUN_MODULE_URL__", straightRunDomainUrl)
  .replace("__TB_RIGID_TRANSFORM_MODULE_URL__", legacyRigidTransformDomainUrl)
  .replace("__TB_DYNAMIC_INPUT_MODULE_URL__", dynamicInputDomainUrl)
  .replace("__TB_TRANSFORM_COMMANDS_MODULE_URL__", transformCommandsDomainUrl)
  .replace("__TB_COPY_DEPENDENCIES_MODULE_URL__", copyDependenciesDomainUrl)
  .replace(/<\/script/gi, "<\\/script");
const bundledEditingUi =
  `<script data-tubebender-bundled="editing-ui">\n${editingUi}\n</script>`;

const snapEngineDomainUrl = moduleDataUrl(snapEngineDomainPath);
const snapTrackingRuntime = fs.readFileSync(snapTrackingRuntimePath, "utf8")
  .replace("__TB_SNAP_ENGINE_MODULE_URL__", snapEngineDomainUrl)
  .replace(/<\/script/gi, "<\\/script");
const bundledSnapTrackingRuntime =
  `<script data-tubebender-bundled="snap-tracking-runtime">\n${snapTrackingRuntime}\n</script>`;

const transformGizmoRuntime = fs.readFileSync(transformGizmoRuntimePath, "utf8")
  .replace(/<\/script/gi, "<\\/script");
const bundledTransformGizmoRuntime =
  `<script data-tubebender-bundled="transform-gizmo-runtime">\n${transformGizmoRuntime}\n</script>`;

const geometryGripsRuntime = fs.readFileSync(geometryGripsRuntimePath, "utf8")
  .replace("__TB_GEOMETRY_GRIPS_DYNAMIC_INPUT_URL__", dynamicInputDomainUrl)
  .replace(/<\/script/gi, "<\\/script");
const bundledGeometryGripsRuntime =
  `<script data-tubebender-bundled="geometry-grips-runtime">\n${geometryGripsRuntime}\n</script>`;

const propertiesPanelRuntime = fs.readFileSync(propertiesPanelRuntimePath, "utf8")
  .replace(/<\/script/gi, "<\\/script");
const bundledPropertiesPanelRuntime =
  `<script data-tubebender-bundled="properties-panel-runtime">\n${propertiesPanelRuntime}\n</script>`;

const objectLocksDomainUrl = moduleDataUrl(objectLocksDomainPath);
const objectLockRuntime = fs.readFileSync(objectLockRuntimePath, "utf8")
  .replace("__TB_OBJECT_LOCKS_MODULE_URL__", objectLocksDomainUrl)
  .replace(/<\/script/gi, "<\\/script");
const bundledObjectLockRuntime =
  `<script data-tubebender-bundled="object-lock-runtime">\n${objectLockRuntime}\n</script>`;

const layersDomainUrl = moduleDataUrl(layersDomainPath);
const layersRuntime = fs.readFileSync(layersRuntimePath, "utf8")
  .replace("__TB_LAYERS_MODULE_URL__", layersDomainUrl)
  .replace(/<\/script/gi, "<\\/script");
const bundledLayersRuntime =
  `<script data-tubebender-bundled="layers-runtime">\n${layersRuntime}\n</script>`;

const groupsDomainUrl = moduleDataUrl(groupsDomainPath);
const groupsRigidDomainUrl = moduleDataUrl(legacyRigidTransformDomainPath);
const groupsRuntime = fs.readFileSync(groupsRuntimePath, "utf8")
  .replace("__TB_GROUPS_MODULE_URL__", groupsDomainUrl)
  .replace("__TB_GROUP_RIGID_MODULE_URL__", groupsRigidDomainUrl)
  .replace("__TB_COPY_DEPENDENCIES_MODULE_URL__", copyDependenciesDomainUrl)
  .replace(/<\/script/gi, "<\\/script");
const bundledGroupsRuntime =
  `<script data-tubebender-bundled="groups-runtime">\n${groupsRuntime}\n</script>`;

const assembliesDomainUrl = moduleDataUrl(assembliesDomainPath);
const assembliesRigidDomainUrl = moduleDataUrl(legacyRigidTransformDomainPath);
const assembliesRuntime = fs.readFileSync(assembliesRuntimePath, "utf8")
  .replace("__TB_ASSEMBLIES_MODULE_URL__", assembliesDomainUrl)
  .replace("__TB_ASSEMBLY_RIGID_MODULE_URL__", assembliesRigidDomainUrl)
  .replace(/<\/script/gi, "<\\/script");
const bundledAssembliesRuntime =
  `<script data-tubebender-bundled="assemblies-runtime">\n${assembliesRuntime}\n</script>`;

const geometricConstraintsDomainUrl = moduleDataUrl(geometricConstraintsDomainPath);
const constraintInferenceDomainUrl = moduleDataUrl(constraintInferenceDomainPath);
const constraintDofDomainUrl = moduleDataUrl(constraintDofDomainPath);
const autoConstrainDomainUrl = moduleDataUrl(autoConstrainDomainPath);
const constraintsRuntime = fs.readFileSync(constraintsRuntimePath, "utf8")
  .replace("__TB_GEOMETRIC_CONSTRAINTS_MODULE_URL__", geometricConstraintsDomainUrl)
  .replace("__TB_CONSTRAINT_INFERENCE_MODULE_URL__", constraintInferenceDomainUrl)
  .replace("__TB_CONSTRAINT_DOF_MODULE_URL__", constraintDofDomainUrl)
  .replace("__TB_AUTO_CONSTRAIN_MODULE_URL__", autoConstrainDomainUrl)
  .replace(/<\/script/gi, "<\\/script");
const bundledConstraintsRuntime =
  `<script data-tubebender-bundled="constraints-runtime">\n${constraintsRuntime}\n</script>`;

const toleranceProfileDomainUrl = moduleDataUrl(toleranceProfileDomainPath);
const toleranceProfileRuntime = fs.readFileSync(toleranceProfileRuntimePath, "utf8")
  .replace("__TB_TOLERANCE_PROFILE_MODULE_URL__", toleranceProfileDomainUrl)
  .replace(/<\/script/gi, "<\\/script");
const bundledToleranceProfileRuntime =
  `<script data-tubebender-bundled="tolerance-profile-runtime">\n${toleranceProfileRuntime}\n</script>`;

const fittedGeometryPolicyDomainUrl = moduleDataUrl(fittedGeometryPolicyDomainPath);
const fittedGeometryRuntime = fs.readFileSync(fittedGeometryRuntimePath, "utf8")
  .replace("__TB_FITTED_GEOMETRY_POLICY_MODULE_URL__", fittedGeometryPolicyDomainUrl)
  .replace(/<\/script/gi, "<\\/script");
const bundledFittedGeometryRuntime =
  `<script data-tubebender-bundled="fitted-geometry-runtime">\n${fittedGeometryRuntime}\n</script>`;

const normalizeFittedGeometryDomainUrl = moduleDataUrl(normalizeFittedGeometryDomainPath);
const batchNormalizeFittedDomainUrl = moduleDataUrl(batchNormalizeFittedDomainPath);
const normalizeGeometryRuntime = fs.readFileSync(normalizeGeometryRuntimePath, "utf8")
  .replace("__TB_NORMALIZE_FITTED_GEOMETRY_MODULE_URL__", normalizeFittedGeometryDomainUrl)
  .replace("__TB_BATCH_NORMALIZE_MODULE_URL__", batchNormalizeFittedDomainUrl)
  .replace(/<\/script/gi, "<\\/script");
const bundledNormalizeGeometryRuntime =
  `<script data-tubebender-bundled="normalize-geometry-runtime">\n${normalizeGeometryRuntime}\n</script>`;

const deleteDependenciesDomainUrl = moduleDataUrl(deleteDependenciesDomainPath);
const deleteDependenciesRuntime = fs.readFileSync(deleteDependenciesRuntimePath, "utf8")
  .replace("__TB_DELETE_DEPENDENCIES_MODULE_URL__", deleteDependenciesDomainUrl)
  .replace(/<\/script/gi, "<\\/script");
const bundledDeleteDependenciesRuntime =
  `<script data-tubebender-bundled="delete-dependencies-runtime">\n${deleteDependenciesRuntime}\n</script>`;

const associativeArrayRuntime = fs.readFileSync(associativeArrayRuntimePath, "utf8")
  .replace("__TB_TRANSFORM_COMMANDS_MODULE_URL__", transformCommandsDomainUrl)
  .replace("__TB_RIGID_TRANSFORM_MODULE_URL__", legacyRigidTransformDomainUrl)
  .replace("__TB_DYNAMIC_INPUT_MODULE_URL__", dynamicInputDomainUrl)
  .replace(/<\/script/gi, "<\\/script");
const bundledAssociativeArrayRuntime =
  `<script data-tubebender-bundled="associative-array-runtime">\n${associativeArrayRuntime}\n</script>`;

const arrayGripsRuntime = fs.readFileSync(arrayGripsRuntimePath, "utf8")
  .replace(/<\/script/gi, "<\\/script");
const bundledArrayGripsRuntime =
  `<script data-tubebender-bundled="array-grips-runtime">\n${arrayGripsRuntime}\n</script>`;

const associativeMirrorRuntime = fs.readFileSync(associativeMirrorRuntimePath, "utf8")
  .replace("__TB_RIGID_TRANSFORM_MODULE_URL__", legacyRigidTransformDomainUrl)
  .replace(/<\/script/gi, "<\\/script");
const bundledAssociativeMirrorRuntime =
  `<script data-tubebender-bundled="associative-mirror-runtime">\n${associativeMirrorRuntime}\n</script>`;

const transformStackDomainUrl = moduleDataUrl(transformStackDomainPath);
const transformStackRuntime = fs.readFileSync(transformStackRuntimePath, "utf8")
  .replace("__TB_TRANSFORM_STACK_MODULE_URL__", transformStackDomainUrl)
  .replace(/<\/script/gi, "<\\/script");
const bundledTransformStackRuntime =
  `<script data-tubebender-bundled="transform-stack-runtime">\n${transformStackRuntime}\n</script>`;

const equipmentRuntimeBridge = fs.readFileSync(equipmentRuntimeBridgePath, "utf8").replace(/<\/script/gi, "<\\/script");
const bundledEquipmentRuntimeBridge =
  `<script data-tubebender-bundled="equipment-runtime-bridge">\n${equipmentRuntimeBridge}\n</script>`;

const trimCutRuntimeBridge = fs.readFileSync(trimCutRuntimeBridgePath, "utf8").replace(/<\/script/gi, "<\\/script");
const bundledTrimCutRuntimeBridge =
  `<script data-tubebender-bundled="trim-cut-runtime-bridge">\n${trimCutRuntimeBridge}\n</script>`;

const machineToolingDomainUrl = moduleDataUrl(machineToolingDomainPath);
const machineSetupDomainUrl = moduleDataUrl(machineSetupDomainPath);
const bendSequenceDomainUrl = moduleDataUrl(bendSequenceDomainPath);
const simulationCollisionDomainUrl = moduleDataUrl(simulationCollisionDomainPath);
const clearanceMonitorDomainUrl = moduleDataUrl(clearanceMonitorDomainPath);
const equipmentLibraryUi = fs.readFileSync(equipmentLibraryUiPath, "utf8")
  .replace("__TB_MACHINE_TOOLING_MODULE_URL__", machineToolingDomainUrl)
  .replace("__TB_MACHINE_SETUP_MODULE_URL__", machineSetupDomainUrl)
  .replace("__TB_BEND_SEQUENCE_MODULE_URL__", bendSequenceDomainUrl)
  .replace("__TB_SIM_COLLISION_MODULE_URL__", simulationCollisionDomainUrl)
  .replace("__TB_CLEARANCE_MODULE_URL__", clearanceMonitorDomainUrl)
  .replace(/<\/script/gi, "<\\/script");
const bundledEquipmentLibraryUi =
  `<script data-tubebender-bundled="equipment-library-ui">\n${equipmentLibraryUi}\n</script>`;

const reproducibilityDomainUrl = moduleDataUrl(reproducibilityDomainPath);
const reproducibilityRuntime = fs.readFileSync(reproducibilityRuntimePath, "utf8")
  .replace("__TB_REPRODUCIBILITY_MODULE_URL__", reproducibilityDomainUrl)
  .replace(/<\/script/gi, "<\\/script");
const bundledReproducibilityRuntime =
  `<script data-tubebender-bundled="reproducibility-runtime">\n${reproducibilityRuntime}\n</script>`;

if (!output.includes("</body>")) {
  throw new Error("Standalone source HTML is missing </body>");
}
const interactionOrbitDownAnchor =
  "  down(e){\n"+
  "    if (!this.enabled) return;\n"+
  "    if (e.pointerType === 'mouse' && ![0,1,2].includes(e.button)) return;\n"+
  "    e.preventDefault();";
if(!output.includes(interactionOrbitDownAnchor)){
  throw new Error("SimpleOrbitControls down anchor missing for interaction priority");
}
output=output.replace(
  interactionOrbitDownAnchor,
  "  down(e){\n"+
  "    if (!this.enabled) return;\n"+
  "    if (e.pointerType === 'mouse' && ![0,1,2].includes(e.button)) return;\n"+
  "    if (e.pointerType === 'mouse' && Number(e.button) === 2) return;\n"+
  "    if (window.TubeBenderInteractionPriority?.shouldOrbitStart?.(e) === false) return;\n"+
  "    e.preventDefault();"
);
output=output.replace(
  "this._mode = (p.pointerType === 'mouse' && (p.button === 1 || p.button === 2 || e.shiftKey)) ? 'pan' : 'rotate';",
  "this._mode = (p.pointerType === 'mouse' && (p.button === 1 || e.shiftKey)) ? 'pan' : 'rotate';"
);
output=output.replace(
  "this._mode = remaining.pointerType === 'mouse' && (remaining.button === 1 || remaining.button === 2) ? 'pan' : 'rotate';",
  "this._mode = remaining.pointerType === 'mouse' && remaining.button === 1 ? 'pan' : 'rotate';"
);
const interactionCancelAnchor =
  "  pointerTolerance(pointerType){\n"+
  "    return pointerType === 'touch' ? this.touchTapTolerance : this.mouseTapTolerance;\n"+
  "  }";
if(!output.includes(interactionCancelAnchor)){
  throw new Error("SimpleOrbitControls pointerTolerance anchor missing");
}
output=output.replace(
  interactionCancelAnchor,
  interactionCancelAnchor+"\n\n"+
  "  cancelGesture(){\n"+
  "    for(const id of this._pointers.keys()){try{this.domElement.releasePointerCapture?.(id);}catch{}}\n"+
  "    this._pointers.clear();this._mode='none';this._primaryPointerId=null;this._lastSingle=null;this._pinchDistance=0;this._pinchCenter=null;this._gestureMoved=false;this._hadMultiplePointers=false;this._tapCandidate=null;this._suppressSelectionUntil=performance.now()+120;return true;\n"+
  "  }"
);

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
  bundledObjectSelectionContextUi +
  "\n" +
  bundledRepeatCommandRuntime +
  "\n" +
  bundledHotkeysRuntime +
  "\n" +
  bundledCommandPaletteRuntime +
  "\n" +
  bundledSelectionSetsRuntime +
  "\n" +
  bundledNamedViewsRuntime +
  "\n" +
  bundledSectionViewRuntime +
  "\n" +
  bundledProjectTubeBarLayoutFix +
  "\n" +
  bundledEquipmentRuntimeBridge +
  "\n" +
  bundledTrimCutRuntimeBridge +
  "\n" +
  bundledEquipmentLibraryUi +
  "\n" +
  bundledReproducibilityRuntime +
  "\n" +
  bundledMaterialManufacturingBridge +
  "\n" +
  bundledMeasurementsUi +
  "\n" +
  bundledScreenSpaceDisplayRuntime +
  "\n" +
  bundledInteractionPriorityRuntime +
  "\n" +
  bundledDimensionGripsRuntime +
  "\n" +
  bundledAssociativeArrayRuntime +
  "\n" +
  bundledArrayGripsRuntime +
  "\n" +
  bundledAssociativeMirrorRuntime +
  "\n" +
  bundledTransformStackRuntime +
  "\n" +
  bundledSnapTrackingRuntime +
  "\n" +
  bundledEditingUi +
  "\n" +
  bundledTransformGizmoRuntime +
  "\n" +
  bundledGeometryGripsRuntime +
  "\n" +
  bundledPropertiesPanelRuntime +
  "\n" +
  bundledObjectLockRuntime +
  "\n" +
  bundledLayersRuntime +
  "\n" +
  bundledGroupsRuntime +
  "\n" +
  bundledAssembliesRuntime +
  "\n" +
  bundledConstraintsRuntime +
  "\n" +
  bundledToleranceProfileRuntime +
  "\n" +
  bundledFittedGeometryRuntime +
  "\n" +
  bundledNormalizeGeometryRuntime +
  "\n" +
  bundledDeleteDependenciesRuntime +
  "\n" +
  bundledMaterialLibraryUi +
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
      if(
        normalizedPackage?.project &&
        typeof bridge.normalizeImportedProjectBendRadiiToTechnology==='function'
      ){
        const radiusNormalized=await bridge.normalizeImportedProjectBendRadiiToTechnology(
          normalizedPackage.project,
          Array.isArray(pipeDb)?pipeDb:[],
          {od_tolerance_mm:0.02}
        );
        normalizedPackage={...normalizedPackage,project:radiusNormalized.project};
        dwfxImport.technological_radius_normalized_count=radiusNormalized.normalized_count;
        dwfxImport.technological_radius_changed_count=radiusNormalized.changed_count;
        dwfxImport.technological_radius_unresolved_count=radiusNormalized.unresolved_count;
        dwfxImport.technological_radius_blocked_count=radiusNormalized.blocked_count;
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
if (!output.includes('data-tubebender-bundled="material-library-ui"')) {
  throw new Error("Standalone build is missing the Material Library UI marker");
}
if (!output.includes('data-tubebender-bundled="measurements-ui"')) {
  throw new Error("Standalone build is missing the Measurements UI marker");
}
if (!output.includes('data-tubebender-bundled="editing-ui"')) {
  throw new Error("Standalone build is missing the Editing UI marker");
}
if (!output.includes('data-tubebender-bundled="associative-array-runtime"')) {
  throw new Error("Standalone build is missing the Associative Array runtime marker");
}
if (!output.includes('data-tubebender-bundled="associative-mirror-runtime"')) {
  throw new Error("Standalone build is missing the Associative Mirror runtime marker");
}
if (!output.includes('data-tubebender-bundled="transform-stack-runtime"')) {
  throw new Error("Standalone build is missing the Transform Stack runtime marker");
}
if (!output.includes("TubeBenderTransformStacks") || !output.includes("associative_transform_stacks")) {
  throw new Error("Standalone build is missing Transform Stack integration hooks");
}
if (!output.includes("TubeBenderAssociativeMirrors") || !output.includes("associative_mirrors")) {
  throw new Error("Standalone build is missing Associative Mirror integration hooks");
}
if (!output.includes("TubeBenderAssociativeArrays") || !output.includes("associative_arrays")) {
  throw new Error("Standalone build is missing Associative Array integration hooks");
}
if (!output.includes("TubeBenderEditing") || !output.includes("straightRun")) {
  throw new Error("Standalone build is missing Editing integration hooks");
}
if (!output.includes("TubeBenderMeasurements") || !output.includes("engineering_dimensions")) {
  throw new Error("Standalone build is missing Measurements integration hooks");
}
if (output.includes("__TB_SIM_COLLISION_MODULE_URL__")) {
  throw new Error("Standalone build still contains unresolved simulation collision module URL");
}
if (output.includes("__TB_CLEARANCE_MODULE_URL__")) {
  throw new Error("Standalone build still contains unresolved clearance monitor module URL");
}
if (!output.includes("Persistent Clearance Monitor") || !output.includes("clearance_monitors")) {
  throw new Error("Standalone build is missing clearance monitor integration");
}
if (!output.includes("measureTubePairClearance") || !output.includes("project-clearance-geometry")) {
  throw new Error("Standalone build is missing minimum tube clearance measurement");
}
if (!output.includes("focusClearanceMeasurement") || !output.includes("controls.target.copy(target)")) {
  throw new Error("Standalone build is missing clearance focus helper");
}
if (!output.includes("tbCaptureLiveCollisionGuard") || !output.includes("clearance_edit_mode")) {
  throw new Error("Standalone build is missing live edit collision guard");
}
if (!output.includes("simulationCollisionReport") || !output.includes("ValidationLock")) {
  throw new Error("Standalone build is missing bending simulation collision integration");
}
if (!output.includes("TubeBenderSimulationCollisionLive") || !output.includes("tbOriginalSimCollisionChecks")) {
  throw new Error("Standalone build is missing live simCollisionChecks capture");
}
if (!output.includes('data-tubebender-bundled="material-manufacturing-bridge"')) {
  throw new Error("Standalone build is missing the material manufacturing bridge");
}
if (!output.includes('data-tubebender-bundled="equipment-runtime-bridge"')) {
  throw new Error("Standalone build is missing the equipment runtime bridge");
}
if (!output.includes('data-tubebender-bundled="trim-cut-runtime-bridge"')) {
  throw new Error("Standalone build is missing Trim/Cut runtime bridge");
}
if (!output.includes('data-tubebender-bundled="reproducibility-runtime"')) {
  throw new Error("Standalone build is missing reproducibility runtime");
}
if (!output.includes("TubeBenderReproducibility") || !output.includes("compareCpuGpuEvidence")) {
  throw new Error("Standalone build is missing reproducibility integration hooks");
}
if (!output.includes('data-tubebender-bundled="equipment-library-ui"')) {
  throw new Error("Standalone build is missing the Equipment Library UI");
}
if (!output.includes("TubeBenderMaterials") || !output.includes("material_profile_id")) {
  throw new Error("Standalone build is missing Material Library integration hooks");
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

// PERF-001: replace eager full 3D rebuild after every renderAll() with an
// animation-frame coalescer. UI/text edits remain synchronous; only the costly
// scene reconstruction is deferred to the next available frame.
const perfOldViewerCall =
  "  safeUiCall('renderViewerOnly', ()=>renderViewerOnly(!preserveViewerFrameForCanvasInteraction));";
const perfCoreStart = "function renderAll(){";
const perfOldDoubleCollision =
  "  currentProjectCollisionAnalysis = getProjectCollisionAnalysis(activeProject());\n" +
  "  safeUiCall('renderBoundsWarning', renderBoundsWarning);";
if(!output.includes(perfOldViewerCall)||!output.includes(perfCoreStart)||
   !output.includes(perfOldDoubleCollision)){
  throw new Error("PERF-001 render-core anchors missing or changed");
}
const perfCoalescerSource =
  "const tbViewerFrameCoalescer=(" + createFrameCoalescer.toString() + ")({\n" +
  "  requestFrame: callback=>requestAnimationFrame(callback),\n" +
  "  cancelFrame: id=>cancelAnimationFrame(id),\n" +
  "  render: fit=>safeUiCall('renderViewerOnly',()=>renderViewerOnly(fit)),\n" +
  "  onError: error=>console.error('PERF-001 viewport redraw',error)\n" +
  "});\n" +
  "window.TubeBenderRenderPerformance=Object.freeze({\n" +
  "  get pending(){return tbViewerFrameCoalescer.pending;},\n" +
  "  get stats(){return tbViewerFrameCoalescer.stats;}\n" +
  "});\n";
output=output.replace(perfCoreStart,perfCoalescerSource+perfCoreStart);
output=output.replace(perfOldViewerCall,
  "  tbViewerFrameCoalescer.schedule(!preserveViewerFrameForCanvasInteraction);");
output=output.replace(perfOldDoubleCollision,
  "  // renderBoundsWarning computes and stores the current project collision analysis once.\n" +
  "  safeUiCall('renderBoundsWarning', renderBoundsWarning);");

// PERF-003: failures in independent initialization stages must not prevent
// event binding, nor one broken optional picker prevent later command hooks.
const perfPickerAnchor =
  "  buildViewPicker();\n" +
  "  buildBendPicker();\n" +
  "  setupMiniAxisClickHandlers();";
if(!output.includes(perfPickerAnchor)){
  throw new Error("PERF-003 picker registration anchor missing");
}
output=output.replace(perfPickerAnchor,
  "  tbRunIsolatedStartup([\n" +
  "    ['buildViewPicker',()=>buildViewPicker()],\n" +
  "    ['buildBendPicker',()=>buildBendPicker()],\n" +
  "    ['setupMiniAxisClickHandlers',()=>setupMiniAxisClickHandlers()]\n" +
  "  ],(name,error)=>console.warn('Optional picker initialization: '+name,error));");
const perfBindStart="function bind(){\n  qs('boundsFocusBtn')";
const perfInitAnchor=
  "window.addEventListener('DOMContentLoaded',()=>{ensureIndustrialState();ensureCurrentTubeVisible();bind();renderAll();});";
const bindStart=output.indexOf(perfBindStart),bindEnd=output.indexOf(perfInitAnchor,bindStart);
if(bindStart<0||bindEnd<0)throw new Error("PERF-003 core binding/init anchors missing");
const bindSection=output.slice(bindStart,bindEnd);
const guardedBindings=bindSection.replace(/qs\('([^']+)'\)\.addEventListener\(/g,
  "qs('$1')?.addEventListener(");
output=output.slice(0,bindStart)+guardedBindings+output.slice(bindEnd);
const perfBootstrapSource =
  "const tbScheduleInitialSceneAfterPaint=(" + scheduleInitialSceneAfterPaint.toString() + ");\n" +
  "const tbRunIsolatedStartup=(" + runIsolatedStartup.toString() + ");\n" +
  "window.TubeBenderStartupStatus={phases:[],booted:false,starting:false,startedAt:performance.now()};\n" +
  "function tbStartCore(){\n" +
  "  const status=window.TubeBenderStartupStatus;\n" +
  "  if(status.booted||status.starting)return;\n" +
  "  status.starting=true;\n" +
  "  const onError=(name,error)=>console.error('TubeBender startup '+name,error);\n" +
  "  status.phases.push(...tbRunIsolatedStartup([\n" +
  "    ['ensureIndustrialState',()=>ensureIndustrialState()],\n" +
  "    ['ensureCurrentTubeVisible',()=>ensureCurrentTubeVisible()],\n" +
  "    ['bind',()=>bind()]\n" +
  "  ],onError));\n" +
  "  status.booted=true;status.starting=false;\n" +
  "  // Let bound controls paint before building the potentially large scene.\n" +
  "  status.cancelInitialScene=tbScheduleInitialSceneAfterPaint({\n" +
  "    requestFrame:callback=>requestAnimationFrame(callback),\n" +
  "    cancelFrame:id=>cancelAnimationFrame(id),\n" +
  "    postTask:callback=>setTimeout(callback,0),\n" +
  "    cancelTask:id=>clearTimeout(id),\n" +
  "    draw:()=>status.phases.push(...tbRunIsolatedStartup([['renderAll',()=>renderAll()]],onError))\n" +
  "  });\n" +
  "}\n" +
  "// Core controls already exist by this late inline script; bind now instead\n" +
  "// of waiting for unrelated optional scripts to finish DOMContentLoaded.\n" +
  "if(document.getElementById('app')&&document.getElementById('projectCombo'))tbStartCore();\n" +
  "else if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tbStartCore,{once:true});\n" +
  "else tbStartCore();";
if(!output.includes(perfInitAnchor))throw new Error("PERF-003 initialization hook anchor missing");
output=output.replace(perfInitAnchor,perfBootstrapSource);
if(!output.includes("window.TubeBenderStartupStatus") ||
   !output.includes("window.TubeBenderRenderPerformance")){
  throw new Error("PERF-001/003 runtime integration failed");
}

// Apply responsive containment after legacy/pixel-matched CSS is assembled.
// Styles are scoped to <=1120px and do not change the approved desktop reference.
if(!output.includes("</head>"))throw new Error("MOB-001 head anchor missing");
if(output.includes("tbMobileViewportMOB001"))throw new Error("MOB-001 style already injected");
output=output.replace("</head>", renderMobileViewportStyle()+"\n</head>");
if(!output.includes('id="tbMobileViewportMOB001"'))throw new Error("MOB-001 mobile viewport style missing");

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
      bundledMaterialLibrary: true,
      bundledMeasurementsUi: true,
      bundledScreenSpaceDisplay: true,
      bundledInteractionPriority: true,
      bundledDimensionGrips: true,
      bundledEditingUi: true,
      bundledSnapTrackingRuntime: true,
      bundledTransformGizmo: true,
      bundledGeometryGrips: true,
      bundledPropertiesPanel: true,
      bundledObjectLocks: true,
      bundledLayersRuntime: true,
      bundledGroupsRuntime: true,
      bundledAssembliesRuntime: true,
      bundledConstraintsRuntime: true,
      bundledToleranceProfileRuntime: true,
      bundledFittedGeometryRuntime: true,
      bundledNormalizeGeometryRuntime: true,
      bundledDeleteDependenciesRuntime: true,
      bundledAssociativeArrays: true,
      bundledArrayGrips: true,
      bundledAssociativeMirrors: true,
      bundledTransformStacks: true,
      materialManufacturingCompensation: true,
      equipmentRuntimeBridge: true,
      bundledEquipmentLibrary: true,
      bundledReproducibilityRuntime: true,
      injectedAtFinalBodyClose: true,
      lazyDwfxRuntime: true,
      optionalExternalModules: ["tesseract"]
    },
    null,
    2
  ) + "\n"
);
