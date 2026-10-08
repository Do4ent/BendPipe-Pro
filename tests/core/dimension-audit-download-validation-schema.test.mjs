import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 496: Dimension audit download validation result is versioned",()=>{
  assert.match(ui,/const DIMENSION_AUDIT_DOWNLOAD_VALIDATION_SCHEMA="TubeBender\.DimensionAuditDownloadValidation\.v1"/);
  const fn=ui.match(/function dimensionAuditDownloadValidation\(filename,snapshot\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/validation_schema:DIMENSION_AUDIT_DOWNLOAD_VALIDATION_SCHEMA/);
});
