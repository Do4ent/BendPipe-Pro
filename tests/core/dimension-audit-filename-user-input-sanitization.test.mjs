import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 480: user-controlled Dimension audit filename parts use sanitizer",()=>{
  assert.match(ui,/dimensionAuditFilenamePart\(snapshot\.project_name\|\|snapshot\.project_id,"project"\)/);
  assert.match(ui,/dimensionAuditFilenamePart\(snapshot\?\.view\?\.filter,"all"\)/);
  assert.match(ui,/dimensionAuditFilenamePart\(snapshot\?\.view\?\.sort,"project"\)/);
  assert.match(ui,/dimensionAuditFilenamePart\(searchValue,"query",40\)/);
  assert.match(ui,/dimensionAuditFilenamePart\(focusValue,"dimension",40\)/);
  assert.match(ui,/dimensionAuditFilenamePart\(snapshot\?\.queue\?\.review_reason,"reason"\)/);
  assert.match(ui,/dimensionAuditFilenamePart\(dimension\?\.id,"dimension"\)/);
});
