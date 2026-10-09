import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("questions 944-945: UI embedded health embedding requires canonical shape and signature type",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryHealthEmbeddingCanonical\(/);
  assert.match(ui,/typeof signature!=="string"\|\|signature\.length===0/);
  assert.match(ui,/dimensionAuditDownloadHistoryHealthEmbeddingCanonical\(embedded\)/);
});
