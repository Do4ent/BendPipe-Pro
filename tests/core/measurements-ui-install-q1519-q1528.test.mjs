import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 1519: quick-state getter returns a clone rather than exposing mutable internal state",()=>{
  assert.match(ui,/quickState:\(\)=>clone\(quick\)/);
});

test("question 1520: measurements install is idempotent via installed guard",()=>{
  assert.match(ui,/async function install\(\)\{\s*if\(installed\)return;installed=true;/);
});

test("question 1521: install loads geometry and dimensions modules together",()=>{
  assert.match(ui,/\[geometry,dimensions,reviewProgressDomain,auditDownloadDomain\]=await Promise\.all\(\[\s*import\(GEOMETRY_URL\),\s*import\(DIMENSIONS_URL\)/);
});

test("question 1522: review-progress domain import fails closed to UI fallback",()=>{
  assert.match(ui,/import\(REVIEW_PROGRESS_URL\)\.catch\(error=>\{console\.warn\("Review progress domain failed to load; using UI fallback",error\);return null;\}\)/);
});

test("question 1523: audit-download domain import fails closed to UI fallback",()=>{
  assert.match(ui,/import\(AUDIT_DOWNLOAD_URL\)\.catch\(error=>\{console\.warn\("Audit download domain failed to load; using UI fallback",error\);return null;\}\)/);
});

test("question 1524: install aborts after reporting fatal module-load failure",()=>{
  assert.match(ui,/catch\(error\)\{console\.error\("Measurements UI failed to load",error\);return;\}/);
});

test("question 1525: successful install ensures the measurements shell exists",()=>{
  assert.match(ui,/catch\(error\)\{console\.error\("Measurements UI failed to load",error\);return;\}\s*ensureShell\(\);/);
});

test("question 1526: selection-change listener keeps open panel synchronized",()=>{
  assert.match(ui,/window\.addEventListener\("tubebender-selection-change",update\)/);
});

test("question 1527: snap-change and canvas-click listeners feed quick measurement interaction",()=>{
  assert.match(ui,/window\.addEventListener\("tubebender-snap-change",onQuickSnapChange\);\s*document\.getElementById\("threeCanvas"\)\?\.addEventListener\("click",onQuickCanvasClick,true\);/);
});

test("question 1528: module installs once DOM is ready or immediately when already ready",()=>{
  assert.match(ui,/if\(document\.readyState==="loading"\)document\.addEventListener\("DOMContentLoaded",install,\{once:true\}\);else install\(\);/);
});
