import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const SOURCE_PATH = new URL(
  "../../legacy/VC207R7/TubeBender_CAD_VC207R7_Pixel_Matched_Approved_Interface_Release.html",
  import.meta.url
);

const html = fs.readFileSync(SOURCE_PATH, "utf8");

function functionSlice(name, nextName) {
  const startMarker = `function ${name}(`;
  const start = html.indexOf(startMarker);
  assert.notEqual(start, -1, `missing function ${name}`);

  const endMarker = `\nfunction ${nextName}(`;
  const end = html.indexOf(endMarker, start);
  assert.notEqual(end, -1, `missing function boundary after ${name}`);

  return html.slice(start, end);
}

test("legacy VC207R7 inline JavaScript remains syntax-valid", () => {
  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let count = 0;
  for (const match of html.matchAll(scriptPattern)) {
    const attrs = match[1] ?? "";
    const code = match[2] ?? "";
    if (/\bsrc\s*=/.test(attrs)) continue;
    if (/type\s*=\s*["'](?:application\/json|application\/ld\+json)["']/i.test(attrs)) continue;
    new vm.Script(code, { filename: `vc207r7-inline-${count + 1}.js` });
    count += 1;
  }
  assert.ok(count >= 8, `expected at least 8 inline scripts, compiled ${count}`);
});

test("legacy engineering and simulation helper surface is preserved", () => {
  for (const name of [
    "markDimensionLabels",
    "simEnsureState",
    "simBuildTimeline",
    "simCenterlineLength",
    "treeBadge",
    "kpi",
    "renderOverview"
  ]) {
    assert.ok(html.includes(`function ${name}(`), `missing function ${name}`);
  }
});

test("A01: legacy centerline length no longer adds OD/2 to CLR", () => {
  const withPipe = functionSlice("arcLengthForRowWithPipe", "developedLengthWithRowsAndPipe");
  const active = functionSlice("arcLength", "developedLength");

  assert.match(withPipe, /direct=Number\(row\?\.clr\)/);
  assert.match(withPipe, /Number\.isFinite\(direct\)&&direct>0\?direct:Number\(p\?\.Rb\|\|0\)/);
  assert.match(active, /bendCenterlineRadiusMm\(row,state\.diameterIndex\)/);

  assert.doesNotMatch(withPipe, /Rb[^;\n]*\+[^;\n]*(?:mm|outerDiameter)/);
  assert.doesNotMatch(active, /Rb[^;\n]*\+[^;\n]*(?:mm|outerDiameter)/);
});

test("A02: checks panel distinguishes calculation errors from passed", () => {
  const checks = functionSlice("checkRow", "refreshTechnology");

  assert.match(checks, /calculation_error/);
  assert.match(checks, /not_checked/);
  assert.match(checks, /Ошибка расчёта/);
  assert.doesNotMatch(checks, /\[mt\('technology'\),true\]/);
  assert.match(checks, /TubeBenderEngineering\?\.diagnoseTube/);
});

test("A03: legacy tooling records have stable IDs and sort resynchronizes references", () => {
  const helpers = functionSlice("toolingIdToken", "ensureBoxAndOriginState");

  assert.match(helpers, /function ensureToolingIds/);
  assert.match(helpers, /function toolingIndexById/);
  assert.match(helpers, /function resyncToolingReferences/);
  assert.match(helpers, /function toolingInUse/);
  assert.match(helpers, /pipeDb\.sort/);
  assert.match(helpers, /resyncToolingReferences\(\)/);
});

test("A03: tube persistence carries toolingId and unresolved state", () => {
  const createTube = functionSlice("createCheckedTube", "repairTubeForCheck");
  const repairTube = functionSlice("repairTubeForCheck", "verifyProjectHasCheckedPipe");
  const syncTube = functionSlice("syncActiveTubeFromState", "loadActiveTubeToState");

  assert.match(createTube, /toolingId/);
  assert.match(createTube, /toolingUnresolved/);
  assert.match(repairTube, /toolingIndexById/);
  assert.match(repairTube, /toolingUnresolved=true/);
  assert.match(syncTube, /t\.toolingId=state\.toolingId/);
});

test("A03: tooling selector uses IDs rather than array positions", () => {
  const renderSelect = functionSlice("renderPipeSelect", "renderPipeTable");
  const table = functionSlice("renderPipeTable", "renderLangList");

  assert.match(renderSelect, /opt\.value = String\(p\.id\)/);
  assert.doesNotMatch(renderSelect, /opt\.value = String\(i\)/);
  assert.match(table, /toolingInUse\(tool\.id\)/);
  assert.match(table, /Сначала явно назначьте другую оснастку/);
});

test("A04: new engineering defaults do not silently inject Steel or Generic CNC", () => {
  const style = functionSlice("defaultStyle", "defaultMachine");
  const machine = functionSlice("defaultMachine", "ensureProjectEngineering");

  assert.match(style, /material:'Copper'/);
  assert.match(style, /wallThickness:null/);
  assert.match(style, /springbackDeg:null/);
  assert.match(style, /cutAllowanceStart:null/);
  assert.match(style, /confirmed:false/);
  assert.doesNotMatch(style, /material:'Steel'/);

  assert.match(machine, /name:'Оборудование не выбрано'/);
  assert.match(machine, /ncPost:null/);
  assert.match(machine, /confirmed:false/);
  assert.doesNotMatch(machine, /Generic CNC Tube Bender/);
  assert.doesNotMatch(machine, /generic-ybc/);
});

test("A04: saving style and machine explicitly confirms user-entered profiles", () => {
  const styleSave = functionSlice("saveStyleFromForm", "saveMachineFromForm");
  const machineSave = functionSlice("saveMachineFromForm", "markDimensionLabels");

  assert.match(styleSave, /s\.confirmed=true/);
  assert.match(machineSave, /m\.confirmed=true/);
});

test("A05: manufacturing export evaluates production release before any download", () => {
  const start = html.indexOf("function productionReleaseDecision(");
  const end = html.indexOf("\nfunction axisOrderPermutations()", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const block = html.slice(start, end);

  assert.match(block, /toolingUnresolved/);
  assert.match(block, /toolingIndexById/);
  assert.match(block, /style\.confirmed!==true/);
  assert.match(block, /machine\.confirmed!==true/);
  assert.match(block, /analyzePipeBounds/);
  assert.match(block, /diagnoseTube/);

  const exportStart = block.indexOf("function exportManufacturing(");
  const gateCall = block.indexOf("productionReleaseDecision(t,kind)", exportStart);
  const firstDownload = block.indexOf("downloadText(", exportStart);
  assert.ok(gateCall > exportStart, "release gate call must be inside exportManufacturing");
  assert.ok(firstDownload > gateCall, "release gate must execute before the first download");
  assert.match(block, /if\(!gate\.allowed\)/);
  assert.doesNotMatch(block, /\|\|window\.TB_NC_POSTPROCESSORS\['generic-ybc'\]/);
});

test("A05: production release decision is exposed for UI and diagnostics", () => {
  assert.match(
    html,
    /window\.TubeBenderEngineering=\{[^}]*productionReleaseDecision/
  );
});


test("A06: formula parser accepts a degree suffix", () => {
  const formula = functionSlice("evalFormula", "recalculateParameterizedRows");
  const value = vm.runInNewContext(
    `${formula}\nevalFormula("45°", NaN, {});`,
    {}
  );
  assert.equal(value, 45);
});

test("A06: angle edit updates numeric value and angleFormula atomically", () => {
  const edit = functionSlice("editCell", "minStraight");

  assert.match(edit, /const expression=String\(value\)\.trim\(\)/);
  assert.match(edit, /r\.angle=a/);
  assert.match(edit, /r\.angleFormula=expression/);
  assert.match(edit, /if\(!changed\)\{renderAll\(\);return false;\}/);
});

test("A07: bend-plane edit goes through candidate validation before commit", () => {
  const validation = functionSlice("collisionKeyForTube", "lengthHint");
  const editor = functionSlice("refreshEditPanel", "checkRow");

  assert.match(validation, /function validateCandidateRowsForCommit/);
  assert.match(validation, /developedLengthWithRows/);
  assert.match(validation, /analyzePipeBounds/);
  assert.match(validation, /firstStraightTechnologicalViolation/);
  assert.match(validation, /analyzeProjectTubeIntersections/);
  assert.match(validation, /function commitBendPlaneChange/);
  assert.match(validation, /state\.rows=candidate/);

  assert.match(
    editor,
    /commitBendPlaneChange\(i,e\.target\.value,e\.target\)/
  );
  assert.doesNotMatch(
    editor,
    /tbEditPlane[^\n]*r\.plane=e\.target\.value/
  );
});

test("A08: modern editing entry points enforce readonly", () => {
  const edit = functionSlice("editCell", "minStraight");
  const plane = functionSlice("collisionKeyForTube", "lengthHint");
  const editor = functionSlice("refreshEditPanel", "checkRow");
  const readOnlyUi = functionSlice("poApplyReadOnlyUi", "poCreateEditableCopy");

  assert.match(edit, /poReadOnly\(\)/);
  assert.match(plane, /poReadOnly\(\)/);
  assert.match(editor, /data-origin-axis[^]*poReadOnly\(\)/);
  assert.match(readOnlyUi, /#tbEditSummary input/);
  assert.match(readOnlyUi, /#tbEditSummary select/);
});


test("A09: whole-project collisions are visible in checks and block production release", () => {
  const checks = functionSlice("checkRow", "refreshTechnology");
  const start = html.indexOf("function productionReleaseDecision(");
  const end = html.indexOf("\nfunction axisOrderPermutations()", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const gate = html.slice(start, end);

  assert.match(checks, /Пересечения проекта/);
  assert.match(checks, /inactiveOnly/);
  assert.match(gate, /getProjectCollisionAnalysis\(p\)/);
  assert.match(gate, /Проект содержит пересечения труб/);
});

test("A10: project-open normalization never invents LINE 100 or drops unsupported source evidence", () => {
  const normalize = functionSlice("poNormalizeTube", "poNormalizePackage");

  assert.doesNotMatch(normalize, /\{type:'LINE',L:100\}/);
  assert.doesNotMatch(normalize, /unshift\(\{type:'LINE'/);
  assert.match(normalize, /importEvidence/);
  assert.match(normalize, /unsupportedRows/);
  assert.match(normalize, /sourceRows/);
  assert.match(normalize, /productionBlocked/);
  assert.match(normalize, /LINE 100 не создаётся/);
  assert.match(normalize, /первая или ближайшая оснастка не подставляется/);
});

test("A10: project-open helpers do not silently substitute axis, plane, or tooling", () => {
  const axis = functionSlice("poAxisVector", "poPlaneNormal");
  const plane = functionSlice("poPlaneNormal", "poRotate");
  const tool = functionSlice("poToolFor", "poBuildTubePath");
  const pathBuilder = functionSlice("poBuildTubePath", "poClosestSegments");

  assert.match(axis, /return null/);
  assert.doesNotMatch(axis, /axis\|\|'X'/);
  assert.match(plane, /return null/);
  assert.doesNotMatch(tool, /db\?\.\[0\]/);
  assert.doesNotMatch(tool, /mm:22/);
  assert.doesNotMatch(tool, /Rb:40/);
  assert.match(pathBuilder, /tooling is unresolved/);
  assert.match(pathBuilder, /start axis is unsupported/);
  assert.match(pathBuilder, /start plane is unsupported/);
});

test("A10: ambiguous imported data bypasses legacy repair guessing", () => {
  const repair = functionSlice("repairTubeForCheck", "verifyProjectHasCheckedPipe");

  assert.match(repair, /importValidation\?\.productionBlocked===true/);
  const guard = repair.indexOf("importValidation?.productionBlocked===true");
  const normalize = repair.indexOf("normalizeTubeRowStart");
  assert.ok(guard >= 0 && normalize > guard, "ambiguous import guard must execute before geometry normalization");
});

test("A01/A10: project-open developed bend length uses CLR only", () => {
  const pathBuilder = functionSlice("poBuildTubePath", "poClosestSegments");

  assert.match(pathBuilder, /const arcLength=sweep\*bendR/);
  assert.doesNotMatch(pathBuilder, /sweep\*\(bendR\+tubeR\)/);
});


test("A11: open-preview bounds reuse the live 5 mm clearance algorithm", () => {
  const ctx = functionSlice("pipeBoundsContext", "pipeBoundsContextForTube");
  const bounds = functionSlice("analyzePipeBounds", "analyzeTubeBounds");
  const normalize = functionSlice("poNormalizePackage", "poSelectedProjects");

  assert.match(ctx, /pipe:o\.pipe/);
  assert.match(bounds, /ctx\.pipe\|\|pipeAt\(diameterIndex\)/);
  assert.match(normalize, /analyzePipeBounds\(/);
  assert.match(normalize, /PIPE_BBOX_CLEARANCE_MM/);
  assert.match(normalize, /boundsClearanceMm:PIPE_BBOX_CLEARANCE_MM/);
  assert.doesNotMatch(normalize, /_poPath\?\.points[^]*pt\.x-t\._poPath\.radius/);
});

test("A11: missing corpus dimensions block import instead of inventing 3000x1000x1000", () => {
  const normalize = functionSlice("poNormalizePackage", "poSelectedProjects");

  assert.match(normalize, /_poBoundsUnresolved=true/);
  assert.match(normalize, /рамка 3000×1000×1000 не подставляется/);
  assert.match(normalize, /productionBlocked=true/);
});


test("A12: DXF samples bend curvature with an explicit 0.1 mm centerline deviation limit", () => {
  const sampler = functionSlice("dxfCenterlinePoints", "dxfForTube");
  const dxf = functionSlice("dxfForTube", "reportHtml");

  assert.match(sampler, /maxDeviationMm=0\.1/);
  assert.match(sampler, /sagittaStep=2\*Math\.acos\(ratio\)/);
  assert.match(sampler, /Math\.ceil\(sweep\/maxStep\)/);
  assert.match(sampler, /applyAxisAngle\(element\.axis/);
  assert.match(dxf, /MAX_CENTERLINE_DEVIATION_MM/);
  assert.match(dxf, /TUBE_CENTERLINE/);
  assert.doesNotMatch(dxf, /rebuildRouteGraph\(t,false\)/);
  assert.doesNotMatch(dxf, /g\.points\|\|\[\]/);
});


test("A15: bend CLR is persisted independently from later tooling changes", () => {
  const start = html.indexOf("function exactToolAtIndex(");
  const end = html.indexOf("\nfunction arcLengthForRowWithPipe(", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const helpers = html.slice(start, end);

  const result = vm.runInNewContext(
    `var pipeDb=[{id:"tool-65",Rb:65}];
     var state={diameterIndex:0};
     ${helpers}
     var rows=[{type:"BEND",angle:90}];
     snapshotLegacyBendClr(rows,0);
     var first=bendCenterlineRadiusMm(rows[0],0);
     pipeDb[0].Rb=90;
     [first,bendCenterlineRadiusMm(rows[0],0),rows[0].clr,rows[0].clrSource];`,
    {}
  );

  assert.deepEqual(Array.from(result), [
    65,
    65,
    65,
    "legacy_tooling_snapshot"
  ]);
});

test("A15: new bends persist CLR at creation", () => {
  const add = functionSlice("addBendVariant", "addBend");
  const normalize = functionSlice("normalizeTubeRowStart", "firstStraightTechnologicalViolation");

  assert.match(add, /clr:bendCenterlineRadiusMm\(null,state\.diameterIndex\)/);
  assert.match(add, /clrSource:'tooling_default_at_creation'/);
  assert.match(normalize, /snapshotLegacyBendClr\(normalized,diameterIndex\)/);
});

test("A15: core geometry consumers resolve CLR from each bend", () => {
  const centerline = functionSlice("pipeCenterlineBoxForRows", "pipeEnvelopeBoxForRows");
  const envelope = functionSlice("pipeEnvelopeBoxForRows", "pipeBoundsContext");
  const bounds = functionSlice("analyzePipeBounds", "analyzeTubeBounds");
  const collisions = functionSlice("buildTubeCollisionGeometry", "tubeBoxesOverlap");
  const passive = functionSlice("addPassiveVisibleTube", "addOtherVisibleProjectTubes");
  const geometry = functionSlice("geometryForTube", "rebuildRouteGraph");

  assert.match(centerline, /bendCenterlineRadiusMm\(r,diameterIndex\)/);
  assert.match(envelope, /bendCenterlineRadiusMm\(r,diameterIndex\)/);
  assert.match(bounds, /bendCenterlineRadiusMm\(r,diameterIndex\)/);
  assert.match(collisions, /bendCenterlineRadiusMm\(r,snap\.diameterIndex\)/);
  assert.match(passive, /bendCenterlineRadiusMm\(r,tube\.diameterIndex\)/);
  assert.match(geometry, /bendCenterlineRadiusMm\(r,t\.id===state\.activeTubeId\?state\.diameterIndex:t\.diameterIndex\)/);
});

test("A15: manufacturing reports nominal CLR separately from tooling CLR", () => {
  const mf = functionSlice("manufacturingData", "machineSequenceCheck");
  const gate = functionSlice("productionReleaseDecision", "exportManufacturing");

  assert.match(mf, /radius:bendCenterlineRadiusMm\(r,t\.diameterIndex\)/);
  assert.match(mf, /toolRadius:n\(pipeAt\(t\.diameterIndex\)\?\.Rb,0\)/);
  assert.match(gate, /CLR .*не соответствует выбранной оснастке/);
  assert.match(gate, /const clr=Number\(row\.clr\)/);
  assert.match(gate, /номинальный CLR не сохранён в геометрии/);
});

test("A15: project-open preview requires explicit bend CLR after normalization", () => {
  const preview = functionSlice("poBuildTubePath", "poClosestSegments");

  assert.match(preview, /const bendR=Number\(r\.clr\)/);
  assert.match(preview, /missing bend CLR at row/);
  assert.doesNotMatch(preview, /legacyClr=Number\(tool\.Rb\)/);
  assert.match(preview, /const arcLength=sweep\*bendR/);
});


test("A15: simulation uses per-bend CLR instead of one global style radius", () => {
  const length = functionSlice("simCenterlineLength", "simMaterial");
  const shape = functionSlice("simBuildShape", "simOrientCylinder");
  const machine = functionSlice("simAddMachine", "simSegmentDistancePoint");
  const collision = functionSlice("simCollisionChecks", "simAddCollisionMarkers");

  assert.match(length, /const R=Number\(r\.clr\)/);
  assert.doesNotMatch(length, /style\?\.centerlineRadius/);
  assert.match(shape, /const clr=Number\(row\.clr\)/);
  assert.match(shape, /const phaseClr=Number\(phaseRow\?\.clr\)/);
  assert.match(machine, /bend\.radiusMm/);
  assert.match(machine, /bendRadius:R/);
  assert.match(collision, /machinePose\.bendRadius/);
});

test("A15: bend editor shows persisted CLR and origin does not pretend to have one", () => {
  const editor = functionSlice("refreshEditPanel", "checkRow");

  assert.match(
    editor,
    /bendCenterlineRadiusMm\(r,state\.diameterIndex\)\+' мм'/
  );
  assert.match(
    editor,
    /\[mt\('angle'\),'—','',true\],\[mt\('radius'\),'—','',true\]/
  );
});


test("A15: nominal CLR is persisted per bend and used across geometry paths", () => {
  const helpers = html.slice(
    html.indexOf("function exactToolAtIndex("),
    html.indexOf("function developedLengthWithRowsAndPipe(")
  );
  const normalize = functionSlice("normalizeTubeRowStart", "firstStraightTechnologicalViolation");
  const bounds = functionSlice("analyzePipeBounds", "analyzeTubeBounds");
  const collision = functionSlice("buildTubeCollisionGeometry", "tubeBoxesOverlap");
  const geometry = functionSlice("geometryForTube", "rebuildRouteGraph");
  const manufacturing = functionSlice("manufacturingData", "machineSequenceCheck");
  const simulationLength = functionSlice("simCenterlineLength", "simMaterial");
  const simulationShape = functionSlice("simBuildShape", "simOrientCylinder");

  assert.match(helpers, /Number\(row\?\.clr\)/);
  assert.match(helpers, /legacy_tooling_snapshot/);
  assert.match(normalize, /snapshotLegacyBendClr\(normalized,diameterIndex\)/);
  assert.match(bounds, /bendCenterlineRadiusMm\(r,diameterIndex\)/);
  assert.match(collision, /bendCenterlineRadiusMm\(r,snap\.diameterIndex\)/);
  assert.match(geometry, /bendCenterlineRadiusMm\(r,/);
  assert.match(manufacturing, /radius:bendCenterlineRadiusMm\(r,t\.diameterIndex\)/);
  assert.match(manufacturing, /toolRadius:n\(pipeAt\(t\.diameterIndex\)\?\.Rb,0\)/);
  assert.match(simulationLength, /const R=Number\(r\.clr\)/);
  assert.doesNotMatch(simulationLength, /style\?\.centerlineRadius/);
  assert.match(simulationShape, /const clr=Number\(row\.clr\)/);
  assert.match(simulationShape, /const phaseClr=Number\(phaseRow\?\.clr\)/);
});

test("A15: imported unknown formats cannot infer missing CLR from tooling", () => {
  const normalize = functionSlice("poNormalizeTube", "poNormalizePackage");
  const path = functionSlice("poBuildTubePath", "poClosestSegments");
  const gate = functionSlice("productionReleaseDecision", "exportManufacturing");

  assert.match(normalize, /legacyTubeBenderVersion=\/\^VC\\d\+\/i/);
  assert.match(normalize, /CLR гиба отсутствует/);
  assert.match(normalize, /legacy_tooling_snapshot/);
  assert.match(path, /const bendR=Number\(r\.clr\)/);
  assert.doesNotMatch(path, /legacyClr=Number\(tool\.Rb\)/);
  assert.match(gate, /const clr=Number\(row\.clr\)/);
  assert.match(gate, /номинальный CLR не сохранён в геометрии/);
});

test("A15: newly created bend snapshots CLR instead of retaining a live tooling dependency", () => {
  const addBend = functionSlice("addBendVariant", "addBend");

  assert.match(addBend, /clr:bendCenterlineRadiusMm\(null,state\.diameterIndex\)/);
  assert.match(addBend, /clrSource:'tooling_default_at_creation'/);
  assert.match(addBend, /clrToolingId:pipeDb\[state\.diameterIndex\]\?\.id/);
});


test("A13: legacy runtime has real bounded undo/redo model history", () => {
  const start = html.indexOf("const TB_HISTORY_LIMIT=50;");
  const end = html.indexOf("\nfunction arcLength(", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const history = html.slice(start, end);

  assert.match(history, /const tbHistory=\{undo:\[\],redo:\[\],transaction:null,applying:false\}/);
  assert.match(history, /function tbHistorySnapshot\(/);
  assert.match(history, /function tbHistoryCommit\(/);
  assert.match(history, /tbHistory\.redo\.length=0/);
  assert.match(history, /function tbHistoryRestore\(/);
  assert.match(history, /function tbUndo\(/);
  assert.match(history, /function tbRedo\(/);
  assert.match(history, /function tbModelCommand\(/);
  assert.match(history, /poReadOnly\(\)/);
});

test("A13: Undo/Redo toolbar buttons call history instead of placeholder toasts", () => {
  const shell = functionSlice("bindShell", "setMobilePanel");

  assert.match(shell, /tbActionUndo[^\n]*addEventListener\('click',tbUndo\)/);
  assert.match(shell, /tbActionRedo[^\n]*addEventListener\('click',tbRedo\)/);
  assert.match(shell, /tbHistoryUpdateUi\(\)/);
  assert.doesNotMatch(shell, /История изменений будет доступна/);
});

test("A13/A08: primary geometry edits go through the readonly-aware command boundary", () => {
  const edit = functionSlice("editCell", "minStraight");
  const plane = functionSlice("commitBendPlaneChange", "lengthHint");
  const addLine = functionSlice("addLine", "addBendVariant");
  const addBend = functionSlice("addBendVariant", "addBend");
  const first = functionSlice("confirmFirstSegmentDraft", "focusFirstSegmentLengthInput");

  assert.match(edit, /tbModelCommand\(/);
  assert.match(plane, /tbModelCommand\(/);
  assert.match(addLine, /tbModelCommand\(/);
  assert.match(addBend, /tbModelCommand\(/);
  assert.match(first, /tbModelCommand\(/);
});

test("A13: history restore persists model and rehydrates active tube before render", () => {
  const start = html.indexOf("function tbHistoryRestore(");
  const end = html.indexOf("\nfunction tbUndo(", start);
  const restore = html.slice(start, end);

  assert.match(restore, /state=clone\(snapshot\.state\)/);
  assert.match(restore, /pipeDb=clone\(snapshot\.pipeDb\)/);
  assert.match(restore, /loadActiveTubeToState\(\)/);
  assert.match(restore, /localStorage\.setItem\(STORAGE_KEY/);
  assert.match(restore, /renderAll\(\)/);
});
