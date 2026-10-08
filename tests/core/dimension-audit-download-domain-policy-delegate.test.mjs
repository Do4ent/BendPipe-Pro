import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 501: audit download policy delegates to domain with fallback source",()=>{
  const fn=ui.match(/function dimensionAuditDownloadPolicy\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/auditDownloadDomain\?\.dimensionAuditDownloadPolicy/);
  assert.match(fn,/return auditDownloadDomain\.dimensionAuditDownloadPolicy\(\)/);
  assert.match(ui,/function dimensionAuditDownloadPolicySource\(\)/);
  assert.match(ui,/\?"domain":"ui-fallback"/);
  assert.match(ui,/dimensionAuditDownloadPolicy/);
  assert.match(ui,/dimensionAuditDownloadPolicySource/);
});
