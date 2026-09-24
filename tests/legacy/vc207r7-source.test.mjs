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
  const machineSave = functionSlice("saveMachineFromForm", "renderOverview");

  assert.match(styleSave, /s\.confirmed=true/);
  assert.match(machineSave, /m\.confirmed=true/);
});

test("A05: manufacturing export evaluates production release before any download", () => {
  const start = html.indexOf("function productionReleaseDecision(");
  const end = html.indexOf("\nfunction axisOrderPermutations()", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const block = html.slice(start, end);

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
