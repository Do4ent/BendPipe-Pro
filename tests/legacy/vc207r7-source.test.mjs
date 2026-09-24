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
  const startCandidates = [
    "function " + name + "(",
    "async function " + name + "("
  ];
  const starts = startCandidates
    .map((marker) => html.indexOf(marker))
    .filter((index) => index >= 0);
  const start = starts.length ? Math.min(...starts) : -1;
  assert.notEqual(start, -1, "missing function " + name);

  const endCandidates = [
    "\nfunction " + nextName + "(",
    "\nasync function " + nextName + "("
  ];
  const ends = endCandidates
    .map((marker) => html.indexOf(marker, start + 1))
    .filter((index) => index >= 0);
  const end = ends.length ? Math.min(...ends) : -1;
  assert.notEqual(end, -1, "missing function boundary after " + name);

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
  const plane = functionSlice("commitBendPlaneChange", "lengthHint");
  const editor = functionSlice("refreshEditPanel", "checkRow");
  const readOnlyUi = functionSlice("poApplyReadOnlyUi", "poCreateEditableCopy");
  const commandStart = html.indexOf("function tbModelCommand(");
  const commandEnd = html.indexOf("\nwindow.TubeBenderHistory=", commandStart);
  const command = html.slice(commandStart, commandEnd);

  assert.match(edit, /tbModelCommand\(/);
  assert.match(plane, /tbModelCommand\(/);
  assert.match(command, /poReadOnly\(\)/);
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


test("A13: delete and offset operations are atomic model commands", () => {
  const del = functionSlice("deleteActive", "pipeOptionText");
  const delOffset = functionSlice("deleteOffsetAssembly", "decodeEmbeddedOffsetLabHtml");
  const standard = functionSlice("applyStandardOffsetDefinition", "createStandardOffset");
  const createStandard = functionSlice("createStandardOffset", "standardOffsetActualValue");
  const offset = functionSlice("insertOffset", "exportJson");

  assert.match(del, /tbModelCommand\('Удалить элемент'/);
  assert.match(delOffset, /tbModelCommand\('Удалить офсет'/);
  assert.match(standard, /tbModelCommand\('Изменить стандартный офсет'/);
  assert.match(createStandard, /tbModelCommand\('Добавить стандартный офсет'/);
  assert.match(offset, /tbModelCommand\('Изменить офсет'/);
  assert.match(offset, /tbModelCommand\('Добавить офсет'/);
});

test("A13: nested model commands reuse the active transaction instead of creating a second item", () => {
  const start = html.indexOf("function tbModelCommand(");
  const end = html.indexOf("\nwindow.TubeBenderHistory=", start);
  const command = html.slice(start, end);

  assert.match(command, /if\(tbHistory\.applying\|\|tbHistory\.transaction\)return mutate\(\)/);
  assert.match(command, /const token=tbHistoryBegin\(label\)/);
  assert.match(command, /tbHistoryCommit\(token\)/);
});

test("A13: applyEditor commits one history transaction", () => {
  const apply = functionSlice("applyEditor", "cancelEditor");
  assert.match(apply, /tbModelCommand\('Применить параметры элемента'/);
  assert.match(apply, /liveUpdateEditor\(\)/);
});


test("A13: one completed DoF drag creates one history item", () => {
  const start = functionSlice("dofStartInteraction", "dofApplyRotationFromBaseline");
  const handlers = functionSlice("installDofPointerHandlers", "update3D");
  const commit = functionSlice("dofCommitInteraction", "dofCancelInteraction");
  const cancel = functionSlice("dofCancelInteraction", "hideDofAngleEditor");

  assert.match(start, /historyToken=tbHistoryBegin\('Изменить DoF'\)/);
  assert.match(start, /poReadOnly\(\)/);

  const moveStart = handlers.indexOf("window.addEventListener('pointermove'");
  const finishStart = handlers.indexOf("const finish=");
  assert.ok(moveStart >= 0);
  assert.ok(finishStart > moveStart);
  const moveBlock = handlers.slice(moveStart, finishStart);
  const finishBlock = handlers.slice(finishStart);

  assert.doesNotMatch(moveBlock, /tbHistoryCommit/);
  assert.match(finishBlock, /tbHistoryCommit\(I\.historyToken\)/);
  assert.match(finishBlock, /I\.base=dofCaptureBaseline\(\)/);
  assert.match(finishBlock, /I\.historyToken=tbHistoryBegin\('Изменить DoF'\)/);

  assert.match(commit, /tbHistoryCommit\(I\.historyToken\)/);
  assert.match(cancel, /tbHistoryCancel\(I\.historyToken\)/);
  assert.match(cancel, /dofRestoreBaseline\(I\.base\)/);
});

test("A13: Undo and Redo are disabled while a DoF transaction is open", () => {
  const ui = functionSlice("tbHistoryUpdateUi", "tbHistoryBegin");
  const begin = functionSlice("tbHistoryBegin", "tbHistoryCancel");

  assert.match(ui, /!tbHistory\.transaction/);
  assert.match(begin, /tbHistoryUpdateUi\(\)/);
});


test("A14: simulation selects manual or mechanized non-CNC technology explicitly", () => {
  const tech = functionSlice("simEnsureState", "simPhaseTitle");

  assert.match(tech, /function simTechnologyForTube/);
  assert.match(tech, /manual_bender/);
  assert.match(tech, /mechanized_non_cnc/);
  assert.match(tech, /od<19/);
  assert.match(tech, /source:'diameter_default'/);
  assert.match(tech, /kind:'unknown'/);
});

test("A14: manual simulation uses a hand-bender workflow without clamp or powered-bend phases", () => {
  const timeline = functionSlice("simBuildTimeline", "simCurrentPhase");

  assert.match(timeline, /technology\.kind==='manual'/);
  assert.match(timeline, /type:'manual_setup'/);
  assert.match(timeline, /type:'align_mark'/);
  assert.match(timeline, /type:'manual_rotate'/);
  assert.match(timeline, /type:'manual_bend'/);
  assert.match(timeline, /type:'manual_remove'/);

  const manualStart = timeline.indexOf("if(technology.kind==='manual')");
  const mechanizedStart = timeline.indexOf("}else{", manualStart);
  const manualBlock = timeline.slice(manualStart, mechanizedStart);
  assert.doesNotMatch(manualBlock, /type:'clamp'/);
  assert.doesNotMatch(manualBlock, /type:'powered_bend'/);
  assert.doesNotMatch(manualBlock, /type:'head_return'/);
});

test("A14: mechanized non-CNC simulation keeps feed and rotation manual", () => {
  const timeline = functionSlice("simBuildTimeline", "simCurrentPhase");

  assert.match(timeline, /type:'machine_setup'/);
  assert.match(timeline, /type:'manual_feed'/);
  assert.match(timeline, /type:'manual_rotate'/);
  assert.match(timeline, /type:'clamp'/);
  assert.match(timeline, /type:'powered_bend'/);
  assert.match(timeline, /type:'head_return'/);
  assert.match(timeline, /type:'unclamp'/);
  assert.doesNotMatch(timeline, /automatic_(?:feed|rotate|carriage)/i);
});

test("A14: simulation row progression understands technology-specific phases", () => {
  const rowFraction = functionSlice("simRowFraction", "simCenterlineLength");

  assert.match(rowFraction, /manual_setup/);
  assert.match(rowFraction, /machine_setup/);
  assert.match(rowFraction, /align_mark/);
  assert.match(rowFraction, /manual_feed/);
  assert.match(rowFraction, /manual_bend/);
  assert.match(rowFraction, /powered_bend/);
  assert.match(rowFraction, /head_return/);
  assert.match(rowFraction, /unclamp/);
});

test("A14: manual machine model exposes a handle when handle length is defined", () => {
  const machine = functionSlice("simAddMachine", "simSegmentDistancePoint");

  assert.match(machine, /technology==='manual'/);
  assert.match(machine, /machine\.handleLength/);
  assert.match(machine, /kind:'manual-handle'/);
  assert.match(machine, /handleSegment/);
  assert.match(machine, /coverage:handleSegment\?'die_and_handle':'die_only'/);
});

test("A14: collision checks include raw stock and manual handle workspace", () => {
  const collision = functionSlice("simCollisionChecks", "simAddCollisionMarkers");

  assert.doesNotMatch(collision, /if\(seg\.kind==='raw'\)continue/);
  assert.match(collision, /seg\.kind!=='raw'/);
  assert.match(collision, /machinePose\.handleSegment/);
  assert.match(collision, /type:'manual-handle'/);
  assert.match(collision, /type:machinePose\.technology==='manual'\?'manual-die':'machine-head'/);
});

test("A14: simulation UI names the actual technology and warns when it is only diameter-derived", () => {
  const render = functionSlice("renderSimulation", "renderAutoroute");
  const helpers = functionSlice("simEnsureState", "simPhaseTitle");

  assert.match(render, /techLabel=simTechnologyLabel/);
  assert.match(render, /techHelp=simTechnologyHelp/);
  assert.match(render, /3D-симуляция · \$\{esc\(techLabel\)\}/);
  assert.match(helpers, /требует подтверждения профиля/);
  assert.match(helpers, /Автоматическая каретка и автоматические переходы не моделируются/);
});

test("A14: unresolved technology produces a blocked simulation phase", () => {
  const timeline = functionSlice("simBuildTimeline", "simCurrentPhase");

  assert.match(timeline, /technology\.kind==='unknown'/);
  assert.match(timeline, /type:'blocked'/);
  assert.match(timeline, /Не определён тип оборудования/);
});


test("A14: equipment profile UI exposes manual and mechanized non-CNC technology", () => {
  const machine = functionSlice("renderMachine", "renderManufacturing");

  assert.match(machine, /engMachine_technology/);
  assert.match(machine, /value="manual"/);
  assert.match(machine, /value="mechanized_non_cnc"/);
  assert.match(machine, /Ручной трубогиб/);
  assert.match(machine, /Механизированный без ЧПУ/);
  assert.doesNotMatch(machine, /engMachine_ncPost/);
});

test("A14: equipment profile persists manual handle geometry inputs", () => {
  const defaults = functionSlice("defaultMachine", "ensureProjectEngineering");
  const save = functionSlice("saveMachineFromForm", "markDimensionLabels");
  const render = functionSlice("renderMachine", "renderManufacturing");

  assert.match(defaults, /handleLength:null/);
  assert.match(defaults, /handleWorkspaceRadius:null/);
  assert.match(render, /handleLength/);
  assert.match(render, /handleWorkspaceRadius/);
  assert.match(save, /'technology'/);
  assert.match(save, /'handleLength'/);
  assert.match(save, /'handleWorkspaceRadius'/);
  assert.match(save, /m\.ncPost=null/);
});

test("A14: NC export is not shown for manual or non-CNC profiles", () => {
  const manufacturing = functionSlice("renderManufacturing", "renderSimulation");

  assert.match(manufacturing, /ncApplicable=String\(d\.machine\?\.technology\|\|''\)\.toLowerCase\(\)==='cnc'/);
  assert.match(manufacturing, /NC: не применяется/);
  assert.match(manufacturing, /ncApplicable\?'<button class="eng-btn primary" data-eng-export="nc">NC<\/button>'/);
  assert.match(manufacturing, /simTechnologyForTube\(activeTube\(\),d\)/);
});


test("A16: project tree groups offset rows by assemblyId", () => {
  const tree = functionSlice("refreshProjectTree", "refreshEditPanel");

  assert.match(tree, /ensureConstructionMetadata\(\)/);
  assert.match(tree, /renderedAssemblies=new Set\(\)/);
  assert.match(tree, /r\?\.assemblyId&&r\?\.assemblyType==='offset'/);
  assert.match(tree, /data-tree-assembly=/);
  assert.match(tree, /offsetAssemblyRows\(assemblyId\)/);
  assert.match(tree, /offsetDisplayName\(assemblyId\)/);
  assert.match(tree, /data-tree-assembly-part=/);
});

test("A16: offset children select the assembly rather than an independent row", () => {
  const tree = functionSlice("refreshProjectTree", "refreshEditPanel");

  assert.match(
    tree,
    /data-tree-assembly-part[\s\S]*selectOffsetAssembly\(n\.dataset\.treeAssemblyPart,false\)/
  );
  assert.doesNotMatch(
    tree,
    /data-tree-assembly-part[\s\S]*selectConstructionRow\(Number\(n\.dataset\.treeRowRef\)\)/
  );
});

test("A16: composite offset collapse state is persisted in the tree", () => {
  const tree = functionSlice("refreshProjectTree", "refreshEditPanel");

  assert.match(tree, /state\.collapsedAssemblies\?\.\[assemblyId\]===true/);
  assert.match(tree, /data-tree-assembly-toggle/);
  assert.match(tree, /state\.collapsedAssemblies\[id\]=!/);
  assert.match(tree, /save\(\);refreshProjectTree\(\)/);
});

test("A16: null bottom selection cannot become row zero", () => {
  const editor = functionSlice("refreshEditPanel", "checkRow");
  const tree = functionSlice("refreshProjectTree", "refreshEditPanel");

  assert.match(
    editor,
    /Number\.isInteger\(bottomParamEditorIndex\)&&bottomParamEditorIndex>=0/
  );
  assert.doesNotMatch(editor, /const i=Number\(bottomParamEditorIndex\)/);
  assert.match(
    tree,
    /Number\.isInteger\(bottomParamEditorIndex\)&&bottomParamEditorIndex===i/
  );
});

test("A16: selected offset shows a composite editor summary instead of row zero", () => {
  const editor = functionSlice("refreshEditPanel", "checkRow");

  assert.match(editor, /if\(selectedAssemblyId\)/);
  assert.match(editor, /offsetAssemblyRows\(selectedAssemblyId\)/);
  assert.match(editor, /offsetAssemblyDefinition\(selectedAssemblyId\)/);
  assert.match(editor, /Внутренние LINE\/BEND редактируются через параметры офсета/);
  assert.match(editor, /Составной офсет/);
});


test("A17: pixel-match layout patch no longer owns localized text", () => {
  const start = html.indexOf("function setApprovedText(");
  const end = html.indexOf("\n  let mockupRefreshQueued", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const block = html.slice(start, end);

  assert.doesNotMatch(block, /textContent\s*=/);
  assert.doesNotMatch(block, /Профессиональное проектирование трубопроводов/);
  assert.doesNotMatch(block, /＋ Новый/);
  assert.match(block, /must not own interface language/);
});

test("A17: approved mockup refresh is queued and guarded against reentry", () => {
  const start = html.indexOf("let mockupRefreshQueued=false;");
  const end = html.indexOf("window.TubeBenderApprovedMockup=", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const block = html.slice(start, end);

  assert.match(block, /let mockupRefreshing=false/);
  assert.match(block, /if\(mockupRefreshing\)return/);
  assert.match(block, /function scheduleExactRefresh\(/);
  assert.match(block, /if\(mockupRefreshQueued\)return/);
  assert.match(block, /requestAnimationFrame/);
  assert.doesNotMatch(block, /setTimeout\(exactRefresh,0\)/);
});

test("A17: resize schedules layout only and does not force a language rewrite", () => {
  const start = html.indexOf("function exactRefresh(");
  const end = html.indexOf("function scheduleExactRefresh(", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const refresh = html.slice(start, end);

  const layoutStart = html.indexOf("let mockupRefreshQueued=false;");
  const layoutEnd = html.indexOf("window.TubeBenderApprovedMockup=", layoutStart);
  const layout = html.slice(layoutStart, layoutEnd);

  assert.match(layout, /window\.addEventListener\('resize',scheduleExactRefresh\)/);
  assert.doesNotMatch(refresh, /setApprovedText\(\)/);
  assert.doesNotMatch(refresh, /TubeBenderI18n\?\.apply/);
});


test("A18: app and project schema versions have one runtime source of truth", () => {
  assert.match(html, /window\.TubeBenderBuildInfo=Object\.freeze\(\{/);
  assert.match(html, /appVersion:'VC207R7-M1'/);
  assert.match(html, /projectSchemaVersion:'2\.0'/);
  assert.match(html, /buildChannel:'trusted-geometry-core'/);
});

test("A18: project export and recovery use centralized version metadata", () => {
  const workspace = functionSlice("poWorkspacePayload", "poStoreRecovery");
  const recovery = functionSlice("poStoreRecovery", "poScheduleRecovery");

  assert.match(workspace, /version:window\.TubeBenderBuildInfo\.appVersion/);
  assert.match(workspace, /schemaVersion:window\.TubeBenderBuildInfo\.projectSchemaVersion/);
  assert.match(recovery, /version:window\.TubeBenderBuildInfo\.appVersion/);
  assert.match(recovery, /schemaVersion:window\.TubeBenderBuildInfo\.projectSchemaVersion/);

  assert.doesNotMatch(workspace, /VC207R3\.0-interactive-dof-manipulators/);
  assert.doesNotMatch(recovery, /version:'VC204'/);
});

test("A18: engineering schema and generated NC header use build metadata", () => {
  assert.match(
    html,
    /const ENG_SCHEMA=window\.TubeBenderBuildInfo\?\.projectSchemaVersion\|\|'2\.0'/
  );
  assert.match(
    html,
    /TubeBender CAD \$\{window\.TubeBenderBuildInfo\?\.appVersion\|\|'VC207R7'\}/
  );
  assert.doesNotMatch(
    html,
    /const ENG_SCHEMA='VC202\.0'/
  );
});

test("A18: open-project compatibility is schema-driven rather than tied to VC183 text", () => {
  const normalize = functionSlice("poNormalizePackage", "poSelectedProjects");

  assert.match(normalize, /const schemaVersion=String\(/);
  assert.match(normalize, /schemaVersion,/);
  assert.match(normalize, /schemaVersion!==String\(window\.TubeBenderBuildInfo\?\.projectSchemaVersion\|\|'2\.0'\)/);
  assert.doesNotMatch(normalize, /String\(version\)\.includes\('VC183'\)/);
});

test("A18: core dependency is vendored while optional OCR remains explicit", () => {
  assert.match(html, /dependencies:Object\.freeze\(\{/);
  assert.match(html, /three:Object\.freeze\(\{source:'vendored-local'/);
  assert.match(html, /url:'\.\.\/\.\.\/vendor\/three\/r160\/three\.min\.js'/);
  assert.match(html, /tesseract:Object\.freeze\(\{source:'lazy-external'/);
  assert.match(html, /offlineCoreReady:true/);
  assert.match(html, /offlineReady:false/);
  assert.match(html, /window\.tubeBenderDependencyReport=/);
  assert.match(
    html,
    /<script src="\.\.\/\.\.\/vendor\/three\/r160\/three\.min\.js" data-tubebender-vendored="three-r160"><\/script>/
  );
  assert.doesNotMatch(
    html,
    /<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/three@/
  );
  assert.match(
    html,
    /s\.src=window\.TubeBenderBuildInfo\?\.dependencies\?\.tesseract\?\.url/
  );
});
