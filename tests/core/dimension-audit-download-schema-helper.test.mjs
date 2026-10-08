import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 488: Dimension audit schema validation is centralized",()=>{
  assert.match(ui,/function dimensionAuditDownloadSchemaSupported\(schema\)/);
  assert.match(ui,/DIMENSION_AUDIT_DOWNLOAD_SCHEMAS\.includes\(String\(schema\?\?""\)\.trim\(\)\)/);
  assert.match(ui,/if\(!dimensionAuditDownloadSchemaSupported\(snapshotSchema\)\)/);
  assert.match(ui,/dimensionAuditDownloadSchemaSupported,downloadVisibleDimensionAudits/);
});
