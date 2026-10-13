import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 491: Dimension audit download validation exposes diagnostic result",()=>{
  assert.match(ui,/function dimensionAuditDownloadValidation\(filename,snapshot\)/);
  assert.match(ui,/code:"INVALID_FILENAME"/);
  assert.match(ui,/code:"INVALID_SNAPSHOT"/);
  assert.match(ui,/code:"UNSUPPORTED_SCHEMA"/);
  assert.match(ui,/code:"OK"/);
  assert.match(ui,/dimensionAuditDownloadValidation,downloadVisibleDimensionAudits/);
});
