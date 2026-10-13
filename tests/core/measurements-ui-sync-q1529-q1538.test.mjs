import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 1529: update computes a fresh selection signature",()=>{
  assert.match(ui,/const update=\(\)=>\{\s*const next=selectionSignature\(\);/);
});

test("question 1530: update only reacts when selection signature changes",()=>{
  assert.match(ui,/if\(next!==lastSelectionKey\)\{lastSelectionKey=next;/);
});

test("question 1531: update only rerenders the measurements panel when it is open",()=>{
  assert.match(ui,/if\(next!==lastSelectionKey\)\{lastSelectionKey=next;if\(panel\?\.classList\.contains\("open"\)\)render\(\);\}/);
});

test("question 1532: section-view changes invalidate derived dimensions with a reason",()=>{
  assert.match(ui,/window\.addEventListener\("tubebender-section-view-change",\(\)=>invalidateSectionDerivedDimensions\("Section View changed"\)\)/);
});

test("question 1533: dimension-change rerenders only an open panel",()=>{
  assert.match(ui,/window\.addEventListener\("tubebender-dimension-change",\(\)=>\{if\(panel\?\.classList\.contains\("open"\)\)render\(\);\}\)/);
});

test("question 1534: audit-download rerenders only an open panel",()=>{
  assert.match(ui,/window\.addEventListener\("tubebender-dimension-audit-download",\(\)=>\{if\(panel\?\.classList\.contains\("open"\)\)render\(\);\}\)/);
});

test("question 1535: audit-history export rerenders only an open panel",()=>{
  assert.match(ui,/window\.addEventListener\("tubebender-dimension-audit-history-export",\(\)=>\{if\(panel\?\.classList\.contains\("open"\)\)render\(\);\}\)/);
});

test("question 1536: clearing audit-history export rerenders only an open panel",()=>{
  assert.match(ui,/window\.addEventListener\("tubebender-dimension-audit-history-export-clear",\(\)=>\{if\(panel\?\.classList\.contains\("open"\)\)render\(\);\}\)/);
});

test("question 1537: history changes rerender only an open panel",()=>{
  assert.match(ui,/window\.addEventListener\("tubebender-history-change",\(\)=>\{if\(panel\?\.classList\.contains\("open"\)\)render\(\);\}\)/);
});

test("question 1538: install keeps selection synchronization alive with a 500 ms poll",()=>{
  assert.match(ui,/poll=setInterval\(update,500\)/);
});
