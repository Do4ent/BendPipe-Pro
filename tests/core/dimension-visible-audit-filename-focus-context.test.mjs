import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 476: visible audit filename includes bounded exact-focus context",()=>{
  assert.match(ui,/const focusValue=String\(snapshot\?\.view\?\.focus_id\?\?""\)\.trim\(\)/);
  assert.match(ui,/const focusName=focusValue\?"-focus-"\+dimensionAuditFilenamePart\(focusValue,"dimension",40\):""/);
  assert.match(ui,/const stem=name\+"-dimension-audit-view-"\+filterName\+"-"\+sortName\+searchName\+focusName\+"-"\+snapshot\.dimension_count/);
  assert.match(ui,/dimensionAuditJsonFilename\(stem,snapshot\.generated_at\)/);
});
