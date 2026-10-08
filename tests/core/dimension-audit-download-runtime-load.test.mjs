import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 500: Measurements UI loads audit download domain as optional dependency",()=>{
  assert.match(ui,/const AUDIT_DOWNLOAD_URL="__TB_AUDIT_DOWNLOAD_MODULE_URL__"/);
  assert.match(ui,/auditDownloadDomain=null/);
  assert.match(ui,/import\(AUDIT_DOWNLOAD_URL\)\.catch\(error=>\{console\.warn\("Audit download domain failed to load; using UI fallback",error\);return null;\}\)/);
});
