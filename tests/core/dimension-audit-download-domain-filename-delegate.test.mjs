import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 503: audit filename generators delegate to domain with UI fallback",()=>{
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditFilenameStamp/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditFilenamePart/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditJsonFilename/);
});
