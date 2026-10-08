import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 489: Dimension audit filename validation is centralized",()=>{
  assert.match(ui,/function dimensionAuditDownloadFilenameSupported\(filename\)/);
  assert.match(ui,/value\.length<=DIMENSION_AUDIT_FILENAME_POLICY\.json_max_length/);
  assert.match(ui,/value\.endsWith\("\.json"\)/);
  assert.match(ui,/if\(!dimensionAuditDownloadFilenameSupported\(safeFilename\)\)/);
  assert.match(ui,/dimensionAuditDownloadFilenameSupported,dimensionAuditDownloadSchemaSupported/);
});
