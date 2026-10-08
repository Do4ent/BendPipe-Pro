import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 493: Dimension audit download validation codes are centralized and exposed",()=>{
  assert.match(ui,/const DIMENSION_AUDIT_DOWNLOAD_VALIDATION_CODES=Object\.freeze\(\[/);
  assert.match(ui,/"OK"/);
  assert.match(ui,/"INVALID_FILENAME"/);
  assert.match(ui,/"INVALID_SNAPSHOT"/);
  assert.match(ui,/"UNSUPPORTED_SCHEMA"/);
  assert.match(ui,/function dimensionAuditDownloadValidationCodes\(\)/);
});
