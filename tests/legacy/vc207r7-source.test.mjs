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

  assert.match(withPipe, /centerlineR\s*=\s*Number\(p\?\.Rb\s*\|\|\s*0\)/);
  assert.match(active, /centerlineR\s*=\s*Number\(p\?\.Rb\s*\|\|\s*0\)/);

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
