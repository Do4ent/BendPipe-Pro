import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 642: UI validates embedded health embedding diagnostics before export",()=>{
  const fn=ui.match(/function dimensionAuditDownloadHistoryEmbeddedHealthEmbeddingValid\(snapshot=\{\}\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryEmbeddedHealthEmbeddingValid/);
  const gate=/if\(!dimensionAuditDownloadHistoryEmbeddedHealthEmbeddingValid\(snapshot\)\)\{toast\("Audit download history embedded diagnostics invalid"\);return false;\}/g;
  assert.equal((ui.match(gate)??[]).length,2);
  assert.match(ui,/data-embedded-diagnostics-valid="'\+\(dimensionAuditDownloadHistoryEmbeddedHealthEmbeddingValid\(auditDownloadHistorySnapshot\)\?'1':'0'\)\+'"/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryEmbeddedHealthEmbeddingValid:/);
});
