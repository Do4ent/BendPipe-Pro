import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 636: UI validates embedded audit history health before export",()=>{
  const fn=ui.match(/function dimensionAuditDownloadHistoryEmbeddedHealthValid\(snapshot=\{\}\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryEmbeddedHealthValid/);
  const gate=/if\(!healthEmbedding\.valid\)\{toast\("Audit download history embedded health invalid: "\+healthEmbedding\.code\);return false;\}/g;
  assert.equal((ui.match(gate)??[]).length,2);
  assert.match(ui,/data-embedded-health-valid="'\+\(auditDownloadHistoryHealthEmbedding\.valid\?'1':'0'\)\+'"/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryEmbeddedHealthValid:/);
});
