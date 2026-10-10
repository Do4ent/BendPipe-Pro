import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 474: visible audit filename includes active sort context",()=>{
  assert.match(ui,/const sortName=dimensionAuditFilenamePart\(snapshot\?\.view\?\.sort,"project"\)/);
  assert.match(ui,/const stem=name\+"-dimension-audit-view-"\+filterName\+"-"\+sortName\+searchName\+focusName\+"-"\+snapshot\.dimension_count/);
  assert.match(ui,/dimensionAuditJsonFilename\(stem,snapshot\.generated_at\)/);
});
