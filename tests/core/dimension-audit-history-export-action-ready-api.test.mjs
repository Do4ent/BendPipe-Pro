import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 791: runtime exposes strongest current export action readiness",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportActionReady:/);
  assert.match(ui,/dimensionAuditDownloadHistoryExportPayloadBindingSnapshotValid\(bindingSnapshot,history,chainSnapshot\)&&binding\.allowed===true/);
});
