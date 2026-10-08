import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 816: runtime exposes strongest final readiness per action",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportFinalReady:/);
  assert.match(ui,/dimensionAuditDownloadHistoryExportActionPermitSnapshotValid\(permitSnapshot,action,statusSnapshot,bindingSnapshot,history,chainSnapshot\)&&permit\.ready===true/);
});
