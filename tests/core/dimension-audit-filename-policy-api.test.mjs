import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 484: Dimension audit filename policy is exposed for QA",()=>{
  assert.match(ui,/function dimensionAuditFilenamePolicy\(\)/);
  assert.match(ui,/dimensionAuditFilenamePolicy/);
  assert.match(ui,/dimensionAuditDownloadPolicy/);
  assert.match(ui,/dimensionAuditJsonFilename/);
  assert.match(ui,/dimensionAuditFilenamePolicy/);
  assert.match(ui,/dimensionAuditDownloadFallbackPolicy/);
});
