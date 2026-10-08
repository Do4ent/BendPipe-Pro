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
  const verification=ui.match(/function dimensionAuditDownloadHistoryVerification\(snapshot=\{\}\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(verification,/const embeddedHealthValid=dimensionAuditDownloadHistoryEmbeddedHealthValid\(value\)/);
  assert.match(verification,/!embeddedHealthValid\?"INVALID_EMBEDDED_HEALTH":null/);
  assert.match(ui,/data-embedded-health-valid="'\+\(auditDownloadHistoryHealthEmbedding\.valid\?'1':'0'\)\+'"/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryEmbeddedHealthValid:/);
});
