import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 494: Dimension audit download policy snapshot is exposed",()=>{
  assert.match(ui,/function dimensionAuditDownloadFallbackPolicy\(\)/);
  const fallback=ui.match(/function dimensionAuditDownloadFallbackPolicy\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fallback,/validation_codes:\[\.\.\.DIMENSION_AUDIT_DOWNLOAD_VALIDATION_CODES\]/);
  assert.match(fallback,/schemas:\[\.\.\.DIMENSION_AUDIT_DOWNLOAD_SCHEMAS\]/);
  assert.match(fallback,/filename:\{\.\.\.DIMENSION_AUDIT_FILENAME_POLICY\}/);
  assert.match(ui,/dimensionAuditDownloadPolicy,dimensionAuditDownloadPolicyConsistent/);
});
