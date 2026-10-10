import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 923: UI permit-evidence summary validation fails closed on non-array attempts",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryPermitEvidenceSummaryValid\(/);
  assert.match(ui,/if\(!Array\.isArray\(attempts\)\)return false;/);
  assert.match(ui,/const list=attempts;/);
});
