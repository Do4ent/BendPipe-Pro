import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 504: audit download fallback policy is cross-checked against domain policy",()=>{
  assert.match(ui,/function dimensionAuditDownloadFallbackPolicy\(\)/);
  assert.match(ui,/function dimensionAuditDownloadPolicyConsistent\(\)/);
  assert.match(ui,/JSON\.stringify\(auditDownloadDomain\.dimensionAuditDownloadPolicy\(\)\)===JSON\.stringify\(dimensionAuditDownloadFallbackPolicy\(\)\)/);
  assert.match(ui,/dimensionAuditDownloadFallbackPolicy,dimensionAuditDownloadPolicy,dimensionAuditDownloadPolicyConsistent/);
});
